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
    const { youtubeUrl, style = 'professional', generateTitles = false } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!youtubeUrl) {
      throw new Error('YouTube URL is required');
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log('Generating thumbnail from YouTube video:', videoId);

    // Get the existing thumbnail
    const existingThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    // First, analyze the existing thumbnail to understand the video content
    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this YouTube thumbnail and describe:
1. What is the video about?
2. What are the main visual elements?
3. What emotions does it convey?
4. Suggest an improved thumbnail concept that would get more clicks.

Return JSON:
{
  "videoTopic": string,
  "visualElements": string[],
  "emotions": string[],
  "improvedConcept": string,
  "suggestedText": string
}`
              },
              {
                type: 'image_url',
                image_url: { url: existingThumbnail }
              }
            ]
          }
        ],
      }),
    });

    let videoAnalysis = null;
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      const content = analysisData.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          videoAnalysis = JSON.parse(jsonMatch[0]);
        }
      }
    }

    // Generate an improved thumbnail
    const generatePrompt = videoAnalysis 
      ? `Create a professional YouTube thumbnail for a video about: ${videoAnalysis.videoTopic}

Concept: ${videoAnalysis.improvedConcept}
Style: ${style}
Include dramatic lighting, high contrast, and make it eye-catching.
The thumbnail should be more clickable than the original.
Ultra high resolution, photorealistic, YouTube optimized.`
      : `Create a professional YouTube thumbnail with style: ${style}. Make it dramatic, high contrast, and eye-catching.`;

    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          { role: 'user', content: generatePrompt }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('AI Gateway error:', imageResponse.status, errorText);
      throw new Error(`Failed to generate thumbnail: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // Generate titles if requested
    let titles = null;
    if (generateTitles && videoAnalysis) {
      const titleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-preview',
          messages: [
            {
              role: 'user',
              content: `Generate 5 viral YouTube titles for a video about: "${videoAnalysis.videoTopic}"

Return JSON array:
[{"title": string, "reason": string, "estimatedCTR": "high"|"medium"|"low"}]`
            }
          ],
        }),
      });

      if (titleResponse.ok) {
        const titleData = await titleResponse.json();
        const titleContent = titleData.choices?.[0]?.message?.content;
        if (titleContent) {
          const jsonMatch = titleContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            titles = JSON.parse(jsonMatch[0]);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      videoId,
      originalThumbnail: existingThumbnail,
      generatedThumbnail: generatedImage,
      analysis: videoAnalysis,
      titles,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-from-youtube:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate thumbnail from YouTube' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
