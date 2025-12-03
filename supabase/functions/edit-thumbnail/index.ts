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
    const { imageUrl, editPrompt, editType = 'enhance' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    console.log('Editing thumbnail with Nano Banana Pro:', { editType });

    // Advanced edit instructions using neural network concepts
    const editInstructions: Record<string, string> = {
      enhance: `ENHANCE this thumbnail image for maximum CTR:
1. Increase vibrancy and color saturation strategically
2. Improve contrast and dynamic range
3. Sharpen key focal points
4. Add subtle professional color grading
5. Optimize for small screen viewing
Keep the original composition intact while making it pop visually.`,
      
      text_overlay: `Add professional text overlay to this thumbnail: "${editPrompt}"
Requirements:
- Use bold, highly readable font
- Strong contrast with background (add shadow/outline if needed)
- Strategic placement that doesn't cover key visual elements
- Text should be readable at 100x56 pixels
- Make it attention-grabbing and clickable`,
      
      background_change: `Transform the background of this thumbnail: ${editPrompt}
Requirements:
- Maintain the main subject perfectly
- New background should enhance visual appeal
- Ensure proper lighting integration
- Create depth and visual interest
- Professional quality compositing`,
      
      style_transfer: `Apply this artistic style to the thumbnail: ${editPrompt}
Requirements:
- Maintain recognizability of key elements
- Apply style consistently across the image
- Keep faces/text readable
- Enhance visual appeal while staying on-brand`,
      
      color_grade: `Apply professional color grading: ${editPrompt || 'cinematic, high-impact, viral-worthy'}
Requirements:
- Create mood-appropriate color palette
- Enhance emotional impact
- Maintain natural skin tones if faces present
- Make colors pop on mobile screens`,
      
      remove_background: `Remove the background and create a new one:
1. Precisely cut out the main subject
2. Create a clean, professional gradient or dynamic background
3. Add subtle depth with shadows
4. Ensure edge quality is perfect
5. Background should complement the subject and increase CTR`,
      
      add_effects: `Add professional effects: ${editPrompt || 'dramatic lighting, subtle glow, depth of field, professional finish'}
Requirements:
- Effects should enhance, not distract
- Maintain professional quality
- Optimize for thumbnail viewing size
- Create visual hierarchy
- Make the image more clickable`,

      upscale: `Enhance image quality and resolution:
1. Increase sharpness on key details
2. Reduce noise and artifacts
3. Enhance textures
4. Improve overall clarity
5. Maintain natural appearance`,
    };

    const prompt = editInstructions[editType] || editPrompt || editInstructions.enhance;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview', // Nano Banana Pro for image editing
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
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
    console.log('Edit completed successfully');

    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl) {
      throw new Error('No edited image generated');
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl: editedImageUrl,
      editType,
      model: 'gemini-2.5-flash-image-preview',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in edit-thumbnail:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to edit thumbnail' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
