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

    console.log('Editing thumbnail:', { imageUrl, editPrompt, editType });

    // Use Gemini to edit/enhance the image
    const editInstructions: Record<string, string> = {
      enhance: 'Enhance this thumbnail image to make it more vibrant, professional, and eye-catching. Improve contrast, saturation, and overall visual appeal while maintaining the original composition.',
      text_overlay: `Add text overlay to this thumbnail: "${editPrompt}". Use bold, readable fonts that stand out. Place text strategically for maximum impact.`,
      background_change: `Change the background of this thumbnail: ${editPrompt}. Maintain the main subject while creating a new, engaging background.`,
      style_transfer: `Apply this style to the thumbnail: ${editPrompt}. Transform the image while keeping the main elements recognizable.`,
      color_grade: `Apply color grading to this thumbnail: ${editPrompt || 'cinematic, professional look'}. Adjust colors for maximum visual impact.`,
      remove_background: 'Remove the background from this image and replace it with a clean, professional gradient or solid color that complements the subject.',
      add_effects: `Add these effects to the thumbnail: ${editPrompt || 'dramatic lighting, subtle glow, professional finish'}.`,
    };

    const prompt = editInstructions[editType] || editPrompt || editInstructions.enhance;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
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
    console.log('Edit response received');

    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl) {
      throw new Error('No edited image generated');
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl: editedImageUrl,
      editType,
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
