'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Batch } from '@/types';
import { AdmissionProofUpload } from './AdmissionProofUpload';
import { AdmissionPhotoUpload } from './AdmissionPhotoUpload';
import {
  filterCurrentBatches,
  type AdmissionFormValues,
  type AdmissionProofItem,
} from './admission-form-utils';

export type { AdmissionFormValues };

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

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-0.5">{message}</p>;
}

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
  const errors = form.formState.errors;

  return (
    <>
      <div className="space-y-1">
        <Label>Full Name (as per ID proof)<RequiredMark /></Label>
        <Input {...form.register('full_name')} />
        <FieldError message={errors.full_name?.message} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Mobile Number<RequiredMark /></Label>
          <Input
            type="tel"
            maxLength={10}
            placeholder="10-digit mobile"
            {...form.register('phone')}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              form.setValue('phone', val, { shouldValidate: true });
            }}
          />
          <FieldError message={errors.phone?.message} />
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
          <FieldError message={errors.alternate_phone?.message} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Email Address<RequiredMark /></Label>
        <Input type="email" {...form.register('email')} />
        <FieldError message={errors.email?.message} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Date of Birth<RequiredMark /></Label>
          <Input type="date" {...form.register('date_of_birth')} />
          <FieldError message={errors.date_of_birth?.message} />
        </div>
        <div className="space-y-1">
          <Label>Gender<RequiredMark /></Label>
          <Select
            value={form.watch('gender')}
            onValueChange={(v) => form.setValue('gender', v, { shouldValidate: true, shouldDirty: true })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <FieldError message={errors.gender?.message} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Select Batch<RequiredMark /></Label>
        <Select
          value={form.watch('batch_id') || undefined}
          onValueChange={(v) => form.setValue('batch_id', v, { shouldValidate: true, shouldDirty: true })}
        >
          <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
          <SelectContent>
            {currentBatches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentBatches.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No upcoming or ongoing batches available</p>
        )}
        <FieldError message={errors.batch_id?.message} />
      </div>

      <div className="space-y-1">
        <Label>Admission Date<RequiredMark /></Label>
        <Input type="date" {...form.register('admission_date')} />
        <FieldError message={errors.admission_date?.message} />
      </div>

      <div className="space-y-1">
        <Label>Permanent Address<RequiredMark /></Label>
        <Input
          {...form.register('address_line1')}
          onChange={(e) => {
            form.setValue('address_line1', e.target.value, { shouldValidate: true });
            if (sameAsPermanent) {
              form.setValue('address_line2', e.target.value, { shouldValidate: true });
            }
          }}
        />
        <FieldError message={errors.address_line1?.message} />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label>Current Address<RequiredMark /></Label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={sameAsPermanent}
              onChange={(e) => {
                const checked = e.target.checked;
                onSameAsPermanentChange(checked);
                if (checked) {
                  form.setValue('address_line2', form.getValues('address_line1'), { shouldValidate: true });
                }
              }}
              className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>Same as Permanent Address</span>
          </label>
        </div>
        <Input
          {...form.register('address_line2')}
          readOnly={sameAsPermanent}
          className={sameAsPermanent ? 'cursor-not-allowed bg-muted opacity-70' : ''}
        />
        <FieldError message={errors.address_line2?.message} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label>City<RequiredMark /></Label>
          <Input {...form.register('city')} />
          <FieldError message={errors.city?.message} />
        </div>
        <div className="space-y-1">
          <Label>State<RequiredMark /></Label>
          <Input {...form.register('state')} />
          <FieldError message={errors.state?.message} />
        </div>
        <div className="space-y-1">
          <Label>Pincode<RequiredMark /></Label>
          <Input
            inputMode="numeric"
            maxLength={6}
            {...form.register('pincode')}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              form.setValue('pincode', val, { shouldValidate: true });
            }}
          />
          <FieldError message={errors.pincode?.message} />
        </div>
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
