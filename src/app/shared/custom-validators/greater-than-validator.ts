import { FormGroup, AbstractControl } from "@angular/forms";

export function termMoreThanAmort(
    amotizationYrsName: string,
    amotizationMonthsName: string,
    termYrsName: string

) {
    return (formGroup: FormGroup) => {
        const amotizationYrs = formGroup.controls[amotizationYrsName];
        const amotizationMonths = formGroup.controls[amotizationMonthsName];
        const termYrs = formGroup.controls[termYrsName];


        var totalAmortizationMonths = ((amotizationYrs?.value ?? 0) * 12) + (amotizationMonths?.value ?? 0)
        var totalTermMonths = (termYrs?.value ?? 0) * 12

        if (totalTermMonths > totalAmortizationMonths) {
            amotizationYrs.setErrors({ termMoreThanAmort: true });
            amotizationMonths.setErrors({ termMoreThanAmort: true });
            termYrs.setErrors({ termMoreThanAmort: true });

        } else {
            amotizationYrs.setErrors(null);
            amotizationMonths.setErrors(null)
            termYrs.setErrors(null);
        }
    };
}