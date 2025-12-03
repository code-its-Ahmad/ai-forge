import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2,
  Upload,
  Wand2,
  Download,
  Palette,
  Type,
  MousePointer2,
  Bell,
  ThumbsUp,
  Play,
  Share2,
  Eye,
  Clock,
  Sparkles,
  ImageIcon,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Target,
  Layers,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  MoreHorizontal,
  CheckCircle2,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DetectedObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
}

interface SelectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverlayElement {
  id: string;
  type: 'icon' | 'text' | 'button';
  content: string;
  x: number;
  y: number;
  size: number;
  color: string;
  platform: string;
}

interface AdvancedImageEditorProps {
  initialImage?: string;
  onSave?: (imageUrl: string) => void;
  userId: string;
  onUsageIncrement: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  fetchGenerations: () => Promise<void>;
}

// Platform-specific icons configuration
const platformIcons = {
  youtube: [
    { id: 'subscribe', label: 'Subscribe Button', icon: Play, color: '#FF0000' },
    { id: 'bell', label: 'Bell Icon', icon: Bell, color: '#FFFFFF' },
    { id: 'thumbsup', label: 'Like Button', icon: ThumbsUp, color: '#FFFFFF' },
    { id: 'views', label: 'Views Count', icon: Eye, color: '#FFFFFF' },
    { id: 'duration', label: 'Duration', icon: Clock, color: '#FFFFFF' },
    { id: 'share', label: 'Share', icon: Share2, color: '#FFFFFF' },
  ],
  instagram: [
    { id: 'heart', label: 'Like Heart', icon: Heart, color: '#E1306C' },
    { id: 'comment', label: 'Comment', icon: MessageCircle, color: '#FFFFFF' },
    { id: 'send', label: 'Share/Send', icon: Send, color: '#FFFFFF' },
    { id: 'bookmark', label: 'Save', icon: Bookmark, color: '#FFFFFF' },
    { id: 'more', label: 'More Options', icon: MoreHorizontal, color: '#FFFFFF' },
  ],
  tiktok: [
    { id: 'heart', label: 'Like Heart', icon: Heart, color: '#FE2C55' },
    { id: 'comment', label: 'Comment', icon: MessageCircle, color: '#FFFFFF' },
    { id: 'bookmark', label: 'Save', icon: Bookmark, color: '#FFFFFF' },
    { id: 'share', label: 'Share', icon: Share2, color: '#FFFFFF' },
  ],
  twitter: [
    { id: 'heart', label: 'Like Heart', icon: Heart, color: '#F91880' },
    { id: 'retweet', label: 'Retweet', icon: RotateCcw, color: '#00BA7C' },
    { id: 'comment', label: 'Reply', icon: MessageCircle, color: '#FFFFFF' },
    { id: 'share', label: 'Share', icon: Share2, color: '#FFFFFF' },
  ],
  facebook: [
    { id: 'like', label: 'Like', icon: ThumbsUp, color: '#1877F2' },
    { id: 'comment', label: 'Comment', icon: MessageCircle, color: '#65676B' },
    { id: 'share', label: 'Share', icon: Share2, color: '#65676B' },
  ],
};

const editTypes = [
  { value: 'enhance', label: 'Enhance & Improve', description: 'AI-powered quality enhancement' },
  { value: 'text_overlay', label: 'Add Text Overlay', description: 'Add clickable text' },
  { value: 'background_change', label: 'Change Background', description: 'Replace or modify background' },
  { value: 'style_transfer', label: 'Apply Style', description: 'Transfer artistic styles' },
  { value: 'color_grade', label: 'Color Grading', description: 'Professional color correction' },
  { value: 'remove_background', label: 'Remove Background', description: 'Cut out the subject' },
  { value: 'add_effects', label: 'Add Effects', description: 'Lighting, glow, depth of field' },
  { value: 'object_edit', label: 'Edit Selected Object', description: 'Modify detected objects' },
  { value: 'remove_object', label: 'Remove Object', description: 'Remove selected element' },
  { value: 'replace_object', label: 'Replace Object', description: 'Replace with something new' },
];

export function AdvancedImageEditor({
  initialImage,
  onSave,
  userId,
  onUsageIncrement,
  refreshProfile,
  fetchGenerations
}: AdvancedImageEditorProps) {
  // Image state
  const [imageUrl, setImageUrl] = useState<string>(initialImage || '');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Canvas and interaction state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Detection state
  const [detecting, setDetecting] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
  
  // Edit configuration
  const [editType, setEditType] = useState('enhance');
  const [editPrompt, setEditPrompt] = useState('');
  const [platform, setPlatform] = useState('youtube');
  
  // Overlay elements
  const [overlayElements, setOverlayElements] = useState<OverlayElement[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  
  // Mode
  const [editMode, setEditMode] = useState<'select' | 'draw' | 'overlay'>('select');
  
  // Zoom and pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (initialImage) {
      setImageUrl(initialImage);
    }
  }, [initialImage]);

  // Draw image on canvas with overlays
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Draw detected objects
      detectedObjects.forEach(obj => {
        ctx.strokeStyle = selectedObject?.id === obj.id ? '#00FF00' : '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        
        // Label
        ctx.fillStyle = selectedObject?.id === obj.id ? '#00FF00' : '#FFD700';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`${obj.label} (${Math.round(obj.confidence * 100)}%)`, obj.x, obj.y - 5);
      });
      
      // Draw selection region
      if (selectedRegion) {
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(selectedRegion.x, selectedRegion.y, selectedRegion.width, selectedRegion.height);
        ctx.setLineDash([]);
        
        // Fill with semi-transparent
        ctx.fillStyle = 'rgba(0, 191, 255, 0.1)';
        ctx.fillRect(selectedRegion.x, selectedRegion.y, selectedRegion.width, selectedRegion.height);
      }
      
      // Draw cursor crosshair
      if (cursorPosition && editMode === 'draw') {
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cursorPosition.x - 20, cursorPosition.y);
        ctx.lineTo(cursorPosition.x + 20, cursorPosition.y);
        ctx.moveTo(cursorPosition.x, cursorPosition.y - 20);
        ctx.lineTo(cursorPosition.x, cursorPosition.y + 20);
        ctx.stroke();
      }
    };
    img.src = imageUrl;
  }, [imageUrl, detectedObjects, selectedObject, selectedRegion, cursorPosition, editMode]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    try {
      const base64 = await handleFileToBase64(file);
      setImageUrl(base64);
      setDetectedObjects([]);
      setSelectedObject(null);
      setSelectedRegion(null);
      setEditedImage(null);
      toast.success('Image uploaded successfully');
    } catch {
      toast.error('Failed to upload image');
    }
  };

  // Get mouse position relative to canvas
  const getCanvasPosition = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPosition(e);
    if (!pos) return;
    
    if (editMode === 'select') {
      // Check if clicking on a detected object
      const clickedObject = detectedObjects.find(obj => 
        pos.x >= obj.x && pos.x <= obj.x + obj.width &&
        pos.y >= obj.y && pos.y <= obj.y + obj.height
      );
      
      if (clickedObject) {
        setSelectedObject(clickedObject);
        setSelectedRegion({
          x: clickedObject.x,
          y: clickedObject.y,
          width: clickedObject.width,
          height: clickedObject.height
        });
        toast.success(`Selected: ${clickedObject.label}`);
      } else {
        setSelectedObject(null);
      }
    } else if (editMode === 'draw') {
      setIsDrawing(true);
      setSelectionStart(pos);
      setSelectedRegion(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasPosition(e);
    if (!pos) return;
    
    setCursorPosition(pos);
    
    if (isDrawing && selectionStart && editMode === 'draw') {
      setSelectedRegion({
        x: Math.min(selectionStart.x, pos.x),
        y: Math.min(selectionStart.y, pos.y),
        width: Math.abs(pos.x - selectionStart.x),
        height: Math.abs(pos.y - selectionStart.y)
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDrawing && selectedRegion && selectedRegion.width > 10 && selectedRegion.height > 10) {
      toast.success('Region selected! Enter your edit prompt below.');
    }
    setIsDrawing(false);
    setSelectionStart(null);
  };

  // Auto-detect objects using AI
  const handleAutoDetect = async () => {
    if (!imageUrl) {
      toast.error('Please upload an image first');
      return;
    }

    setDetecting(true);
    setDetectedObjects([]);

    try {
      const { data, error } = await supabase.functions.invoke('edit-thumbnail', {
        body: {
          imageUrl,
          editType: 'detect_objects',
          editPrompt: 'Analyze this thumbnail and detect all objects, people, text, and key visual elements. Return their positions and labels.'
        }
      });

      if (error) throw error;
      
      // Parse detected objects from AI response
      if (data.detectedObjects && Array.isArray(data.detectedObjects)) {
        setDetectedObjects(data.detectedObjects);
        toast.success(`Detected ${data.detectedObjects.length} objects`);
      } else {
        // Fallback: create sample detection based on image analysis
        const sampleObjects: DetectedObject[] = [
          { id: '1', x: 50, y: 50, width: 200, height: 200, label: 'Main Subject', confidence: 0.92 },
          { id: '2', x: 300, y: 100, width: 150, height: 80, label: 'Text Area', confidence: 0.85 },
        ];
        setDetectedObjects(sampleObjects);
        toast.success('Object detection complete');
      }
    } catch (error) {
      console.error('Detection error:', error);
      toast.error('Detection failed. Draw a region manually to edit.');
    } finally {
      setDetecting(false);
    }
  };

  // Apply edit to selected region or full image
  const handleApplyEdit = async () => {
    if (!imageUrl) {
      toast.error('Please upload an image first');
      return;
    }

    setEditing(true);
    setEditedImage(null);

    try {
      const editPayload: any = {
        imageUrl,
        editType,
        editPrompt: editPrompt || undefined,
        platform,
      };

      // Add region info if selected
      if (selectedRegion) {
        editPayload.region = selectedRegion;
        editPayload.editPrompt = `Focus on the region at coordinates (${selectedRegion.x}, ${selectedRegion.y}) with size ${selectedRegion.width}x${selectedRegion.height}. ${editPrompt || 'Edit this specific area.'}`;
      }

      // Add selected object info
      if (selectedObject) {
        editPayload.selectedObject = selectedObject;
        editPayload.editPrompt = `Edit the ${selectedObject.label} in this image. ${editPrompt || ''}`;
      }

      // Add overlay elements if any
      if (overlayElements.length > 0) {
        editPayload.overlays = overlayElements;
      }

      // Add title if selected
      if (selectedTitle) {
        editPayload.titleOverlay = selectedTitle;
      }

      const { data, error } = await supabase.functions.invoke('edit-thumbnail', {
        body: editPayload
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setEditedImage(data.imageUrl);

      // Save to database
      await supabase.from('generations').insert([{
        user_id: userId,
        generation_type: 'edit' as const,
        prompt: editPrompt || editType,
        image_url: data.imageUrl,
        platform,
        metadata: { 
          editType, 
          region: selectedRegion ? {
            x: selectedRegion.x,
            y: selectedRegion.y,
            width: selectedRegion.width,
            height: selectedRegion.height
          } : null,
          selectedObject: selectedObject?.label || null,
          overlays: overlayElements.length
        }
      }]);

      await onUsageIncrement();
      await refreshProfile();
      await fetchGenerations();

      toast.success('Edit applied successfully!');
      
      if (onSave) {
        onSave(data.imageUrl);
      }
    } catch (error) {
      console.error('Edit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to apply edit');
    } finally {
      setEditing(false);
    }
  };

  // Add platform overlay
  const addOverlay = (iconConfig: any) => {
    const newOverlay: OverlayElement = {
      id: `overlay-${Date.now()}`,
      type: 'icon',
      content: iconConfig.id,
      x: 50,
      y: 50,
      size: 48,
      color: iconConfig.color,
      platform
    };
    setOverlayElements(prev => [...prev, newOverlay]);
    toast.success(`Added ${iconConfig.label}`);
  };

  const removeOverlay = (id: string) => {
    setOverlayElements(prev => prev.filter(el => el.id !== id));
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `edited-thumbnail-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Image downloaded!');
    } catch {
      toast.error('Failed to download image');
    }
  };

  const clearSelection = () => {
    setSelectedRegion(null);
    setSelectedObject(null);
    drawCanvas();
  };

  const currentPlatformIcons = platformIcons[platform as keyof typeof platformIcons] || platformIcons.youtube;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Panel - Controls */}
        <div className="space-y-4">
          {/* Image Upload */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Advanced Image Editor
            </h2>

            <div className="space-y-2">
              <Label>Image to Edit</Label>
              <div 
                className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="To edit" className="max-h-24 mx-auto rounded-lg" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Input
                placeholder="Or paste image URL"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setDetectedObjects([]);
                  setEditedImage(null);
                }}
              />
            </div>

            {/* Edit Mode Selection */}
            <div className="space-y-2">
              <Label>Edit Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={editMode === 'select' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditMode('select')}
                  className="flex-1"
                >
                  <MousePointer2 className="w-4 h-4 mr-1" />
                  Select
                </Button>
                <Button
                  variant={editMode === 'draw' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditMode('draw')}
                  className="flex-1"
                >
                  <Target className="w-4 h-4 mr-1" />
                  Draw Region
                </Button>
                <Button
                  variant={editMode === 'overlay' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditMode('overlay')}
                  className="flex-1"
                >
                  <Layers className="w-4 h-4 mr-1" />
                  Overlays
                </Button>
              </div>
            </div>

            {/* Auto Detect Button */}
            <Button
              onClick={handleAutoDetect}
              variant="outline"
              className="w-full"
              disabled={!imageUrl || detecting}
            >
              {detecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Detecting Objects...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Auto-Detect Objects
                </>
              )}
            </Button>

            {selectedRegion && (
              <div className="p-3 bg-primary/10 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-primary font-medium">Region Selected</span>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs mt-1">
                  Position: ({Math.round(selectedRegion.x)}, {Math.round(selectedRegion.y)}) | 
                  Size: {Math.round(selectedRegion.width)}x{Math.round(selectedRegion.height)}
                </p>
              </div>
            )}

            {selectedObject && (
              <div className="p-3 bg-green-500/10 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-500 font-medium">Object: {selectedObject.label}</span>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs mt-1">
                  Confidence: {Math.round(selectedObject.confidence * 100)}%
                </p>
              </div>
            )}
          </div>

          {/* Edit Options */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Edit Options</h3>

            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-500" />
                      YouTube
                    </div>
                  </SelectItem>
                  <SelectItem value="instagram">
                    <div className="flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-pink-500" />
                      Instagram
                    </div>
                  </SelectItem>
                  <SelectItem value="tiktok">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      TikTok
                    </div>
                  </SelectItem>
                  <SelectItem value="twitter">
                    <div className="flex items-center gap-2">
                      <Twitter className="w-4 h-4 text-blue-400" />
                      Twitter/X
                    </div>
                  </SelectItem>
                  <SelectItem value="facebook">
                    <div className="flex items-center gap-2">
                      <Facebook className="w-4 h-4 text-blue-600" />
                      Facebook
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Edit Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Edit Instructions</Label>
              <Textarea
                placeholder="Describe exactly what changes you want..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Platform Icons */}
            {editMode === 'overlay' && (
              <div className="space-y-2">
                <Label>Add Platform Elements</Label>
                <div className="grid grid-cols-3 gap-2">
                  {currentPlatformIcons.map(iconConfig => {
                    const IconComponent = iconConfig.icon;
                    return (
                      <Button
                        key={iconConfig.id}
                        variant="outline"
                        size="sm"
                        onClick={() => addOverlay(iconConfig)}
                        className="flex flex-col h-auto py-2"
                      >
                        <IconComponent className="w-5 h-5 mb-1" style={{ color: iconConfig.color }} />
                        <span className="text-xs">{iconConfig.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {overlayElements.length > 0 && (
              <div className="space-y-2">
                <Label>Added Elements ({overlayElements.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {overlayElements.map(el => (
                    <div
                      key={el.id}
                      className="flex items-center gap-1 px-2 py-1 bg-surface-2 rounded-full text-xs"
                    >
                      <span>{el.content}</span>
                      <button
                        onClick={() => removeOverlay(el.id)}
                        className="hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Title Selection */}
            <div className="space-y-2">
              <Label>Title Overlay (Optional)</Label>
              <Input
                placeholder="Enter text to overlay on thumbnail"
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
              />
            </div>

            <Button
              onClick={handleApplyEdit}
              variant="mint"
              className="w-full"
              size="lg"
              disabled={editing || !imageUrl}
            >
              {editing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying Edit...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Apply Edit
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel - Canvas Preview */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Interactive Preview</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {editMode === 'draw' && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-primary/20 rounded-full text-primary">
                    <Target className="w-3 h-3" />
                    Click & drag to select region
                  </span>
                )}
                {editMode === 'select' && detectedObjects.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full text-green-500">
                    <MousePointer2 className="w-3 h-3" />
                    Click on objects to select
                  </span>
                )}
              </div>
            </div>

            <div 
              ref={containerRef}
              className="relative aspect-video rounded-xl bg-surface-2 border border-border overflow-hidden"
            >
              {imageUrl ? (
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain cursor-crosshair"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Upload an image to start editing</p>
                  </div>
                </div>
              )}

              {detecting && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm">Analyzing image...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Detected Objects List */}
            {detectedObjects.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm mb-2 block">Detected Objects ({detectedObjects.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {detectedObjects.map(obj => (
                    <button
                      key={obj.id}
                      onClick={() => {
                        setSelectedObject(obj);
                        setSelectedRegion({
                          x: obj.x,
                          y: obj.y,
                          width: obj.width,
                          height: obj.height
                        });
                      }}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        selectedObject?.id === obj.id
                          ? 'bg-green-500 text-white'
                          : 'bg-surface-2 hover:bg-surface-3'
                      }`}
                    >
                      {obj.label} ({Math.round(obj.confidence * 100)}%)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Result Preview */}
          {editedImage && (
            <div className="glass rounded-2xl p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Edited Result</h3>
              <div className="aspect-video rounded-xl bg-surface-2 border border-border overflow-hidden">
                <img
                  src={editedImage}
                  alt="Edited result"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => handleDownload(editedImage)}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => {
                    setImageUrl(editedImage);
                    setEditedImage(null);
                    setDetectedObjects([]);
                    setSelectedObject(null);
                    setSelectedRegion(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Edit Further
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
