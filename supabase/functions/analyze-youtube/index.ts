import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { youtubeUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!youtubeUrl) {
      throw new Error('YouTube URL is required');
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log('Analyzing YouTube video:', videoId);

    // Get all available thumbnail qualities
    const thumbnailUrls = {
      maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      hq: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      mq: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      sd: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
      default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
    };

    // Check which thumbnail qualities are available
    const availableThumbnails: Record<string, string> = {};
    for (const [quality, url] of Object.entries(thumbnailUrls)) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          availableThumbnails[quality] = url;
        }
      } catch {
        // Skip unavailable quality
      }
    }

    // Get the best available thumbnail
    const bestThumbnail = availableThumbnails.maxres || availableThumbnails.hq || availableThumbnails.sd || availableThumbnails.default;

    // Analyze the thumbnail with AI
    let analysis = null;
    if (LOVABLE_API_KEY && bestThumbnail) {
      try {
        const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Analyze this YouTube thumbnail and provide:
1. Overall Score (1-100)
2. Color Analysis (dominant colors, contrast level)
3. Text Analysis (if any text visible, readability score)
4. Face Detection (number of faces, expressions)
5. Composition Analysis (rule of thirds, focal points)
6. CTR Prediction (low/medium/high)
7. 3 Specific Improvements to increase CTR

Return as JSON:
{
  "score": number,
  "colorAnalysis": { "dominantColors": string[], "contrastLevel": "low"|"medium"|"high" },
  "textAnalysis": { "hasText": boolean, "readability": "poor"|"good"|"excellent" },
  "faceAnalysis": { "faceCount": number, "expressions": string[] },
  "composition": { "ruleOfThirds": boolean, "focalPoints": string[] },
  "ctrPrediction": "low"|"medium"|"high",
  "improvements": string[]
}`
                  },
                  {
                    type: 'image_url',
                    image_url: { url: bestThumbnail }
                  }
                ]
              }
            ],
          }),
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          const content = analysisData.choices?.[0]?.message?.content;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysis = JSON.parse(jsonMatch[0]);
            }
          }
        }
      } catch (error) {
        console.error('Analysis error:', error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      videoId,
      thumbnails: availableThumbnails,
      bestThumbnail,
      analysis,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-youtube:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to analyze YouTube video' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
