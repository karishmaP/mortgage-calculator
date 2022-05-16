import { FormGroup, AbstractControl } from "@angular/forms";

export function atleastOneOf(
    control1Name: string,
    control2Name: string
) {
    return (formGroup: FormGroup) => {
        const control1 = formGroup.controls[control1Name];
        const control2 = formGroup.controls[control2Name];
        if (control1.value == null && control2.value == null) {
            control1.setErrors({ atleastOneOf: true });
            control2.setErrors({ atleastOneOf: true });

        } else {
            control1.setErrors(null);
            control2.setErrors(null);
        }
    };
}