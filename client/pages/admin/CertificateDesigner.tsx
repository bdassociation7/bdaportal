/**
 * Certificate Designer - Admin Page
 *
 * WYSIWYG editor for configuring certificate text positions and styling.
 * Changes are saved to database and used by certificate generators.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Save,
  Loader2,
  Download,
} from 'lucide-react';
import {
  CertificateType,
  FieldConfig,
  CertificateDesignConfig,
  getCertificateDesignConfig,
  saveAllFieldConfigs,
  DEFAULT_CONFIGS,
  FIELD_LABELS,
  SAMPLE_DATA,
  TEMPLATE_URLS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '@/services/certificate-design.service';

// Preview scale (template is 3508x2480, we show at 25%)
const PREVIEW_SCALE = 0.25;
const PREVIEW_WIDTH = CANVAS_WIDTH * PREVIEW_SCALE;
const PREVIEW_HEIGHT = CANVAS_HEIGHT * PREVIEW_SCALE;

export default function CertificateDesigner() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [certificateType, setCertificateType] = useState<CertificateType>('CP');
  const [config, setConfig] = useState<CertificateDesignConfig>(DEFAULT_CONFIGS.CP);
  const [selectedField, setSelectedField] = useState<string>('holderName');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load template image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setTemplateImage(img);
    img.onerror = () => {
      toast({
        title: 'Error',
        description: 'Failed to load certificate template',
        variant: 'destructive',
      });
    };
    img.src = TEMPLATE_URLS[certificateType];
  }, [certificateType, toast]);

  // Load config from database
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      const dbConfig = await getCertificateDesignConfig(certificateType);
      setConfig(dbConfig);
      // Select first field
      const fields = Object.keys(dbConfig);
      if (fields.length > 0) {
        setSelectedField(fields[0]);
      }
      setHasChanges(false);
      setLoading(false);
    }
    loadConfig();
  }, [certificateType]);

  // Render preview
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw template
    ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    ctx.drawImage(templateImage, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

    // Draw text fields
    const sampleData = SAMPLE_DATA[certificateType];

    Object.entries(config).forEach(([fieldName, fieldConfig]) => {
      const text = sampleData[fieldName] || fieldName;
      const isSelected = fieldName === selectedField;

      // Scale positions
      const x = fieldConfig.x * PREVIEW_SCALE;
      const y = fieldConfig.y * PREVIEW_SCALE;
      const fontSize = fieldConfig.font_size * PREVIEW_SCALE;

      // Set font
      ctx.font = `${fieldConfig.font_weight} ${fontSize}px "Hind Madurai", sans-serif`;
      ctx.fillStyle = fieldConfig.color;
      ctx.textAlign = fieldConfig.text_align as CanvasTextAlign;
      ctx.textBaseline = 'top';

      // Draw text
      ctx.fillText(text, x, y);

      // Draw selection indicator
      if (isSelected) {
        const metrics = ctx.measureText(text);
        let boxX = x;
        if (fieldConfig.text_align === 'center') {
          boxX = x - metrics.width / 2;
        } else if (fieldConfig.text_align === 'right') {
          boxX = x - metrics.width;
        }

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(boxX - 4, y - 4, metrics.width + 8, fontSize + 8);
        ctx.setLineDash([]);
      }
    });
  }, [templateImage, config, certificateType, selectedField]);

  // Re-render when dependencies change
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to original coordinates
    const x = Math.round(clickX / PREVIEW_SCALE);
    const y = Math.round(clickY / PREVIEW_SCALE);

    updateField(selectedField, { x, y });
  };

  // Update a field's config
  const updateField = (fieldName: string, updates: Partial<FieldConfig>) => {
    setConfig((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        ...updates,
      },
    }));
    setHasChanges(true);
  };

  // Nudge position
  const nudge = (direction: 'up' | 'down' | 'left' | 'right', amount: number) => {
    const field = config[selectedField];
    if (!field) return;

    const updates: Partial<FieldConfig> = {};
    switch (direction) {
      case 'up':
        updates.y = Math.max(0, field.y - amount);
        break;
      case 'down':
        updates.y = Math.min(CANVAS_HEIGHT, field.y + amount);
        break;
      case 'left':
        updates.x = Math.max(0, field.x - amount);
        break;
      case 'right':
        updates.x = Math.min(CANVAS_WIDTH, field.x + amount);
        break;
    }
    updateField(selectedField, updates);
  };

  // Save configuration
  const handleSave = async () => {
    setSaving(true);
    const success = await saveAllFieldConfigs(certificateType, config);
    setSaving(false);

    if (success) {
      setHasChanges(false);
      toast({
        title: 'Saved',
        description: `${certificateType} certificate design saved successfully`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    }
  };

  // Reset to default
  const handleReset = () => {
    setConfig(DEFAULT_CONFIGS[certificateType]);
    setHasChanges(true);
    toast({
      title: 'Reset',
      description: 'Configuration reset to defaults (not saved yet)',
    });
  };

  // Export current config for test script
  const handleExportConfig = () => {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-config-${certificateType}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentField = config[selectedField];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Certificate Designer</h1>
          <p className="text-muted-foreground">
            Configure text positions and styling for certificates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportConfig}>
            <Download className="h-4 w-4 mr-2" />
            Export Config
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Certificate Type Tabs */}
      <Tabs
        value={certificateType}
        onValueChange={(v) => setCertificateType(v as CertificateType)}
      >
        <TabsList>
          <TabsTrigger value="CP">BDA-CP Certificate</TabsTrigger>
          <TabsTrigger value="SCP">BDA-SCP Certificate</TabsTrigger>
          <TabsTrigger value="MEMBERSHIP">Membership Certificate</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview Canvas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Live Preview</span>
              <span className="text-sm font-normal text-muted-foreground">
                Click to reposition selected field
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              <canvas
                ref={canvasRef}
                width={PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT}
                onClick={handleCanvasClick}
                className="cursor-crosshair w-full"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Scale: {Math.round(PREVIEW_SCALE * 100)}% | Original: {CANVAS_WIDTH}x{CANVAS_HEIGHT}px
            </p>
          </CardContent>
        </Card>

        {/* Controls Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Field Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Field Selector */}
            <div className="space-y-2">
              <Label>Select Field</Label>
              <RadioGroup value={selectedField} onValueChange={setSelectedField}>
                {Object.keys(config).map((fieldName) => (
                  <div key={fieldName} className="flex items-center space-x-2">
                    <RadioGroupItem value={fieldName} id={fieldName} />
                    <Label htmlFor={fieldName} className="cursor-pointer">
                      {FIELD_LABELS[fieldName] || fieldName}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {currentField && (
              <>
                {/* Position Controls */}
                <div className="space-y-3">
                  <Label>Position</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">X</Label>
                      <Input
                        type="number"
                        value={currentField.x}
                        onChange={(e) =>
                          updateField(selectedField, { x: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Y</Label>
                      <Input
                        type="number"
                        value={currentField.y}
                        onChange={(e) =>
                          updateField(selectedField, { y: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  {/* Nudge Buttons */}
                  <div className="flex items-center justify-center gap-1">
                    <div className="grid grid-cols-3 gap-1">
                      <div />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => nudge('up', 10)}
                        title="Move up 10px"
                      >
                        <ChevronsUp className="h-4 w-4" />
                      </Button>
                      <div />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => nudge('left', 10)}
                        title="Move left 10px"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <div className="h-8 w-8" />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => nudge('right', 10)}
                        title="Move right 10px"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                      <div />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => nudge('down', 10)}
                        title="Move down 10px"
                      >
                        <ChevronsDown className="h-4 w-4" />
                      </Button>
                      <div />
                    </div>
                    <div className="w-4" />
                    <div className="grid grid-cols-3 gap-1">
                      <div />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => nudge('up', 1)}
                        title="Move up 1px"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <div />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => nudge('left', 1)}
                        title="Move left 1px"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground">
                        1px
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => nudge('right', 1)}
                        title="Move right 1px"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => nudge('down', 1)}
                        title="Move down 1px"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <div />
                    </div>
                  </div>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                  <Label>Font Size: {currentField.font_size}px</Label>
                  <Slider
                    value={[currentField.font_size]}
                    onValueChange={([v]) => updateField(selectedField, { font_size: v })}
                    min={12}
                    max={150}
                    step={1}
                  />
                </div>

                {/* Font Weight */}
                <div className="space-y-2">
                  <Label>Font Weight</Label>
                  <Select
                    value={currentField.font_weight}
                    onValueChange={(v) => updateField(selectedField, { font_weight: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="400">Normal (400)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="600">Semi-Bold (600)</SelectItem>
                      <SelectItem value="700">Bold (700)</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentField.color}
                      onChange={(e) => updateField(selectedField, { color: e.target.value })}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={currentField.color}
                      onChange={(e) => updateField(selectedField, { color: e.target.value })}
                      placeholder="#1c4a8b"
                    />
                  </div>
                </div>

                {/* Text Align */}
                <div className="space-y-2">
                  <Label>Text Align</Label>
                  <Select
                    value={currentField.text_align}
                    onValueChange={(v) =>
                      updateField(selectedField, { text_align: v as 'left' | 'center' | 'right' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Max Width (for long text) */}
                <div className="space-y-2">
                  <Label>Max Width (optional)</Label>
                  <Input
                    type="number"
                    value={currentField.max_width || ''}
                    onChange={(e) =>
                      updateField(selectedField, {
                        max_width: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Auto"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-yellow-800">
            You have unsaved changes. Don't forget to save before leaving.
          </p>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Now
          </Button>
        </div>
      )}
    </div>
  );
}
