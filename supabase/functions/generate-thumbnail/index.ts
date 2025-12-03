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

    console.log('Generating thumbnail with Nano Banana Pro:', { prompt, platform, style });

    // Platform-specific guidelines
    const platformGuidelines: Record<string, { aspectRatio: string; tips: string; dimensions: string }> = {
      youtube: {
        aspectRatio: '16:9',
        dimensions: '1280x720',
        tips: 'Use bold text, high contrast colors, expressive faces, and clear focal points. Include text that is readable even at small sizes. Create dramatic lighting.'
      },
      instagram: {
        aspectRatio: '1:1',
        dimensions: '1080x1080',
        tips: 'Use vibrant colors, aesthetic composition, and lifestyle-oriented imagery. Keep text minimal and stylish.'
      },
      tiktok: {
        aspectRatio: '9:16',
        dimensions: '1080x1920',
        tips: 'Use dynamic, eye-catching visuals with bold colors. Include trendy elements and expressive faces.'
      },
      facebook: {
        aspectRatio: '1.91:1',
        dimensions: '1200x628',
        tips: 'Use engaging visuals that encourage sharing. Clear message and bold text work well.'
      },
      twitter: {
        aspectRatio: '16:9',
        dimensions: '1200x675',
        tips: 'Use striking visuals that stand out in a fast-scrolling feed. Bold colors and clear focal points.'
      },
    };

    const guidelines = platformGuidelines[platform.toLowerCase()] || platformGuidelines.youtube;

    // Style-specific enhancements
    const styleEnhancements: Record<string, string> = {
      professional: 'Clean, corporate aesthetic with professional lighting and modern design elements.',
      bold: 'Dramatic lighting, intense colors, high contrast, impactful visual presence.',
      minimal: 'Clean lines, lots of whitespace, simple color palette, elegant and understated.',
      gaming: 'Neon colors, dynamic effects, action-packed, energetic and exciting atmosphere.',
      lifestyle: 'Warm tones, natural lighting, authentic and relatable feel.',
      cinematic: 'Movie-poster quality, dramatic lighting, widescreen composition, epic feel.',
    };

    const styleGuide = styleEnhancements[style] || styleEnhancements.professional;

    const enhancedPrompt = `Create a professional ${platform.toUpperCase()} thumbnail image.

Topic/Title: "${prompt}"

CRITICAL REQUIREMENTS:
- Aspect Ratio: ${guidelines.aspectRatio} (${guidelines.dimensions})
- Style: ${style} - ${styleGuide}
- ${guidelines.tips}

DESIGN RULES:
1. Use high-impact visuals that grab attention in under 1 second
2. Include a clear focal point with strong visual hierarchy
3. Use bold, contrasting colors that pop on any device
4. If including text, make it LARGE and readable even as a small thumbnail
5. Create professional composition with dramatic lighting
6. Ensure the image works at small sizes (mobile)
7. Ultra high resolution, photorealistic quality
8. NO watermarks, NO logos, NO borders

The thumbnail should make viewers WANT to click immediately.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview', // Nano Banana Pro
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
    console.log('Thumbnail generated successfully');

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
      model: 'gemini-2.5-flash-image-preview',
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
