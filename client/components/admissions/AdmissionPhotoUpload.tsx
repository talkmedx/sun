'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Upload, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
  photo: File | null;
  onChange: (photo: File | null) => void;
};

export function AdmissionPhotoUpload({ photo, onChange }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  const pendingPreview = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const openUpload = () => {
    setPendingFile(photo);
    setFileKey((k) => k + 1);
    setUploadOpen(true);
  };

  const confirmPhoto = () => {
    if (!pendingFile) return;
    onChange(pendingFile);
    setUploadOpen(false);
    setPendingFile(null);
    setFileKey((k) => k + 1);
  };

  const removePhoto = () => {
    onChange(null);
    setPendingFile(null);
    setFileKey((k) => k + 1);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Upload Photo (Optional)</Label>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={openUpload}>
          <Upload className="h-3.5 w-3.5 mr-1" /> Upload Photo
        </Button>
      </div>

      {photo && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2.5 bg-muted/20 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
              {photoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Student" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <span className="font-medium text-foreground block">Student Photo</span>
              <span className="text-muted-foreground truncate block">{photo.name}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            onClick={removePhoto}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) {
            setPendingFile(null);
            setFileKey((k) => k + 1);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Upload Photo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Choose a photo from your device gallery or capture a new photo using the camera.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center space-y-1">
                <ImageIcon className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold text-foreground">From Files / Gallery</span>
                <span className="text-[10px] text-muted-foreground">Local photo</span>
                <input
                  key={`gallery-${fileKey}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setPendingFile(e.target.files[0]);
                  }}
                />
              </label>

              <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center space-y-1">
                <Camera className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold text-foreground">Capture Photo</span>
                <span className="text-[10px] text-muted-foreground">Use Camera</span>
                <input
                  key={`camera-${fileKey}`}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setPendingFile(e.target.files[0]);
                  }}
                />
              </label>
            </div>

            {pendingFile && pendingPreview && (
              <div className="space-y-2">
                <div className="mx-auto h-28 w-28 rounded-xl overflow-hidden border border-border/60 bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pendingPreview} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <div className="p-2.5 bg-muted/40 rounded-lg text-xs flex items-center justify-between font-medium">
                  <span className="truncate max-w-[200px]">{pendingFile.name}</span>
                  <span className="text-primary text-[11px]">{(pendingFile.size / 1024).toFixed(0)} KB</span>
                </div>
              </div>
            )}

            <Button type="button" className="w-full" disabled={!pendingFile} onClick={confirmPhoto}>
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
