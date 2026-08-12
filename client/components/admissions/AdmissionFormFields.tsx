'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Batch } from '@/types';
import { AdmissionProofUpload } from './AdmissionProofUpload';
import { AdmissionPhotoUpload } from './AdmissionPhotoUpload';
import { filterCurrentBatches, type AdmissionProofItem } from './admission-form-utils';

export type AdmissionFormValues = {
  full_name: string;
  phone: string;
  alternate_phone: string;
  email: string;
  date_of_birth: string;
  gender: string;
  admission_date: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  batch_id: string;
  preferred_batch_note: string;
};

type Props = {
  form: UseFormReturn<AdmissionFormValues>;
  batches?: Batch[];
  sameAsPermanent: boolean;
  onSameAsPermanentChange: (checked: boolean) => void;
  proofs: AdmissionProofItem[];
  onProofsChange: (proofs: AdmissionProofItem[]) => void;
  photo: File | null;
  onPhotoChange: (photo: File | null) => void;
};

export function AdmissionFormFields({
  form,
  batches,
  sameAsPermanent,
  onSameAsPermanentChange,
  proofs,
  onProofsChange,
  photo,
  onPhotoChange,
}: Props) {
  const currentBatches = filterCurrentBatches(batches);

  return (
    <>
      <div className="space-y-1">
        <Label>Full Name (as per ID proof) *</Label>
        <Input {...form.register('full_name', { required: true })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Mobile Number *</Label>
          <Input
            type="tel"
            maxLength={10}
            placeholder="10-digit mobile"
            {...form.register('phone', { required: true })}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              form.setValue('phone', val, { shouldValidate: true });
            }}
          />
        </div>
        <div className="space-y-1">
          <Label>Alternate Mobile</Label>
          <Input
            type="tel"
            maxLength={10}
            placeholder="10-digit mobile"
            {...form.register('alternate_phone')}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              form.setValue('alternate_phone', val, { shouldValidate: true });
            }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Email Address</Label>
        <Input type="email" {...form.register('email')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Date of Birth</Label>
          <Input type="date" {...form.register('date_of_birth')} />
        </div>
        <div className="space-y-1">
          <Label>Gender</Label>
          <Select value={form.watch('gender')} onValueChange={(v) => form.setValue('gender', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Select Batch</Label>
        <Select value={form.watch('batch_id')} onValueChange={(v) => form.setValue('batch_id', v)}>
          <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {currentBatches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentBatches.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No upcoming or ongoing batches available</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Admission Date</Label>
        <Input type="date" {...form.register('admission_date')} />
      </div>

      <div className="space-y-1">
        <Label>Permanent Address</Label>
        <Input
          {...form.register('address_line1')}
          onChange={(e) => {
            form.setValue('address_line1', e.target.value);
            if (sameAsPermanent) {
              form.setValue('address_line2', e.target.value);
            }
          }}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label>Current Address</Label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={sameAsPermanent}
              onChange={(e) => {
                const checked = e.target.checked;
                onSameAsPermanentChange(checked);
                if (checked) {
                  form.setValue('address_line2', form.getValues('address_line1'));
                }
              }}
              className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>Same as Permanent Address</span>
          </label>
        </div>
        <Input {...form.register('address_line2')} disabled={sameAsPermanent} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1"><Label>City</Label><Input {...form.register('city')} /></div>
        <div className="space-y-1"><Label>State</Label><Input {...form.register('state')} /></div>
        <div className="space-y-1"><Label>Pincode</Label><Input {...form.register('pincode')} /></div>
      </div>

      <AdmissionPhotoUpload photo={photo} onChange={onPhotoChange} />

      <AdmissionProofUpload proofs={proofs} onChange={onProofsChange} />

      <div className="space-y-1">
        <Label>Preference Note</Label>
        <Textarea rows={2} placeholder="Any specific requirements..." {...form.register('preferred_batch_note')} />
      </div>
    </>
  );
}
