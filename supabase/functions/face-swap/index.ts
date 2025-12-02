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
    const { sourceImageUrl, targetFaceUrl } = await req.json();
    const FACESWAP_API_KEY = Deno.env.get('FACESWAP_API_KEY');

    if (!FACESWAP_API_KEY) {
      throw new Error('FACESWAP_API_KEY is not configured');
    }

    if (!sourceImageUrl || !targetFaceUrl) {
      throw new Error('Both sourceImageUrl and targetFaceUrl are required');
    }

    console.log('Starting face swap:', { sourceImageUrl, targetFaceUrl });

    // Call PiAPI Face Swap API
    const response = await fetch('https://api.piapi.ai/api/v1/task', {
      method: 'POST',
      headers: {
        'X-API-Key': FACESWAP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qubico/image-toolkit',
        task_type: 'face-swap',
        input: {
          target_image: sourceImageUrl,
          swap_image: targetFaceUrl,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Face swap API error:', response.status, errorText);
      throw new Error(`Face swap API error: ${response.status}`);
    }

    const taskData = await response.json();
    console.log('Task created:', taskData);

    // Get task ID and poll for result
    const taskId = taskData.data?.task_id;
    if (!taskId) {
      throw new Error('No task ID returned from face swap API');
    }

    // Poll for task completion (max 60 seconds)
    let result = null;
    const maxAttempts = 30;
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
        headers: {
          'X-API-Key': FACESWAP_API_KEY,
        },
      });

      if (!statusResponse.ok) {
        console.error('Status check error:', statusResponse.status);
        continue;
      }

      const statusData = await statusResponse.json();
      console.log('Task status:', statusData.data?.status);

      if (statusData.data?.status === 'completed') {
        result = statusData.data?.output?.image_url || statusData.data?.output?.image;
        break;
      } else if (statusData.data?.status === 'failed') {
        throw new Error('Face swap task failed');
      }
    }

    if (!result) {
      throw new Error('Face swap timed out');
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl: result,
      taskId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in face-swap:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to perform face swap' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
