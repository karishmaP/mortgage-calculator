import { Input, Directive, HostListener } from "@angular/core";
import { NgControl } from "@angular/forms";
import { DecimalPipe } from "@angular/common";
@Directive({
  selector: '[appDecimalDirective]'
})
export class DecimalDirectiveDirective {
  @Input() precision: number = 2;
  @Input() regex: RegExp | undefined;
  @Input() pipeExp: string = `1.${this.precision}-${this.precision}`;
  constructor(protected _ngControl: NgControl) { }
  @HostListener('focusout', ['$event'])
  protected onBlur(event: FocusEvent) {
    const value = this._ngControl.value;
    if (this.regex && !this.regex.test(value)) {
      this._ngControl.control?.patchValue(null);
    }
    else {
      this.transformValue(value);
    }
  }

  protected transformValue(value: any): void {
    try {
      const pipe = new DecimalPipe('en');
      const formatted = pipe.transform(value, this.pipeExp)?.replace(/,/g, '');
      this._ngControl.control?.patchValue(formatted);
    }
    catch (err) {
      this._ngControl.control!.patchValue(null);
    }
  }
}
