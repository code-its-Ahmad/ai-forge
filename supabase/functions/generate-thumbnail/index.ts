import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, platform = 'youtube', style = 'professional' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('Generating thumbnail for:', { prompt, platform, style });

    // Platform-specific guidelines
    const platformGuidelines: Record<string, { aspectRatio: string; tips: string }> = {
      youtube: {
        aspectRatio: '16:9',
        tips: 'Use bold text, high contrast colors, expressive faces, and clear focal points. Include text that is readable even at small sizes.'
      },
      instagram: {
        aspectRatio: '1:1',
        tips: 'Use vibrant colors, aesthetic composition, and lifestyle-oriented imagery. Keep text minimal and stylish.'
      },
      tiktok: {
        aspectRatio: '9:16',
        tips: 'Use dynamic, eye-catching visuals with bold colors. Include trendy elements and expressive faces.'
      },
    };

    const guidelines = platformGuidelines[platform.toLowerCase()] || platformGuidelines.youtube;

    const enhancedPrompt = `Create a professional YouTube thumbnail image for: "${prompt}"

Style: ${style}
Platform: ${platform.toUpperCase()}
Aspect Ratio: ${guidelines.aspectRatio}

Design Requirements:
- ${guidelines.tips}
- Create a visually striking and attention-grabbing thumbnail
- Use high contrast and bold colors that stand out
- Include clear focal points and avoid clutter
- Make it optimized for ${platform} platform standards
- Professional composition with dramatic lighting
- Ultra high resolution, photorealistic quality`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          { role: 'user', content: enhancedPrompt }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl,
      prompt,
      platform,
      style,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-thumbnail:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate thumbnail' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
