'use client';

import { useState } from 'react';
import { Camera, Image as ImageIcon, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ADMISSION_PROOF_TYPES,
  type AdmissionProofItem,
  type AdmissionProofType,
} from './admission-form-utils';

type Props = {
  proofs: AdmissionProofItem[];
  onChange: (proofs: AdmissionProofItem[]) => void;
};

export function AdmissionProofUpload({ proofs, onChange }: Props) {
  const [typeOpen, setTypeOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AdmissionProofType | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const openTypePicker = () => {
    setSelectedType(null);
    setPendingFile(null);
    setTypeOpen(true);
  };

  const selectType = (type: AdmissionProofType) => {
    setSelectedType(type);
    setPendingFile(null);
    setFileKey((k) => k + 1);
    setTypeOpen(false);
    setUploadOpen(true);
  };

  const addProof = () => {
    if (!selectedType || !pendingFile) return;
    const withoutSameType = proofs.filter((p) => p.type !== selectedType);
    onChange([...withoutSameType, { type: selectedType, file: pendingFile }]);
    setUploadOpen(false);
    setSelectedType(null);
    setPendingFile(null);
    setFileKey((k) => k + 1);
  };

  const removeProof = (type: AdmissionProofType) => {
    onChange(proofs.filter((p) => p.type !== type));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Upload Proofs (Optional)</Label>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={openTypePicker}>
          <Upload className="h-3.5 w-3.5 mr-1" /> Upload Proof
        </Button>
      </div>

      {proofs.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-border/60 p-2.5 bg-muted/20">
          {proofs.map((p) => (
            <div key={p.type} className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-medium text-foreground block">{p.type}</span>
                <span className="text-muted-foreground truncate block">{p.file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => removeProof(p.type)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Proof Type</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {ADMISSION_PROOF_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => selectType(type)}
                className="px-3 py-2.5 text-xs rounded-lg border text-left font-medium transition-all border-border bg-card hover:border-primary hover:bg-primary/5"
              >
                {type}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>{selectedType || 'Upload Proof'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center space-y-1">
                <ImageIcon className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold text-foreground">Upload File / Photo</span>
                <span className="text-[10px] text-muted-foreground">PDF or Gallery</span>
                <input
                  key={`file-${fileKey}`}
                  type="file"
                  accept="image/*,.pdf,application/pdf"
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
                  key={`cam-${fileKey}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setPendingFile(e.target.files[0]);
                  }}
                />
              </label>
            </div>

            {pendingFile && (
              <div className="p-2.5 bg-muted/40 rounded-lg text-xs flex items-center justify-between font-medium">
                <span className="truncate max-w-[200px]">{pendingFile.name}</span>
                <span className="text-primary text-[11px]">{(pendingFile.size / 1024).toFixed(0)} KB</span>
              </div>
            )}

            <Button type="button" className="w-full" disabled={!pendingFile} onClick={addProof}>
              <Plus className="h-4 w-4 mr-1.5" /> Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
