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
            model: 'google/gemini-3-pro-preview', // Latest Gemini 3 Pro
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `You are an elite YouTube thumbnail analyst. Analyze this thumbnail with precision and provide comprehensive insights.

ANALYSIS CRITERIA:
1. Overall Score (1-100) - Be strict and accurate
2. Color Analysis - Identify dominant colors and contrast effectiveness
3. Text Analysis - Detect any text, assess readability at small sizes
4. Face Detection - Count faces, analyze expressions and emotional impact
5. Composition - Rule of thirds, visual hierarchy, focal points
6. CTR Prediction - Based on industry benchmarks
7. 5 Specific Improvements to maximize CTR

Return ONLY this JSON (no markdown):
{
  "score": number,
  "colorAnalysis": { "dominantColors": string[], "contrastLevel": "low"|"medium"|"high", "colorHarmony": string },
  "textAnalysis": { "hasText": boolean, "readability": "poor"|"good"|"excellent", "textContent": string },
  "faceAnalysis": { "faceCount": number, "expressions": string[], "eyeContact": boolean },
  "composition": { "ruleOfThirds": boolean, "focalPoints": string[], "visualFlow": string },
  "ctrPrediction": "low"|"medium"|"high",
  "estimatedCTR": { "min": number, "max": number },
  "improvements": string[],
  "strengths": string[],
  "overallFeedback": string
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
