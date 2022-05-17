import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button'
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar'
import { MortgageCalculatorComponent } from './mortgage-calculator.component';
import { By } from '@angular/platform-browser';
import { NgChartsModule } from 'ng2-charts';



describe('MortgageCalculatorComponent', () => {
  let component: MortgageCalculatorComponent;
  let fixture: ComponentFixture<MortgageCalculatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MortgageCalculatorComponent],
      imports: [
        ReactiveFormsModule,
        BrowserAnimationsModule,
        FormsModule,
        MatInputModule,
        MatSelectModule,
        MatOptionModule,
        MatSlideToggleModule,
        MatTableModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatTooltipModule,
        MatToolbarModule,
        NgChartsModule,
      ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MortgageCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should have 6 mat form fields', () => {
    const formElement = fixture.debugElement.nativeElement.querySelector('form')
    const inputElements = formElement.querySelectorAll('mat-form-field');
    expect(inputElements.length).toEqual(6)
  });

  it('should have correct default values on page load', () => {
    const paymentPlanFormGroup = component.paymentPlan;
    const paymentPlanValues = {
      mtgAmount: 100000,
      annualInterestRate: 3,
      amortizationPeriodYrs: 25,
      amortizationPeriodMonths: null,
      paymentFrequency: 24,
      term: 5,
      prepaymentPlanChecked: false,
    }
    expect(paymentPlanFormGroup.value).toEqual(paymentPlanValues)
  });

  it('should validate default mortgage amount input field', () => {
    const paymentPlanMtgAmountElement: HTMLInputElement = fixture.debugElement.nativeElement.querySelector('form').querySelectorAll('input')[0];
    const mtgAmountValue = component.paymentPlan.controls['mtgAmount'];
    expect(parseFloat(paymentPlanMtgAmountElement.value)).toEqual(mtgAmountValue?.value)
    expect(mtgAmountValue?.errors).toBeNull();
    expect(mtgAmountValue?.errors?.['required']).not.toBeTruthy();
  });

  it('should validate mortgage amount input field after setting to null', (done) => {
    const paymentPlanMtgAmountElement: HTMLInputElement = fixture.debugElement.nativeElement.querySelector('form').querySelectorAll('input')[0];
    paymentPlanMtgAmountElement.value = ''
    paymentPlanMtgAmountElement.dispatchEvent(new Event('input'));
    const mtgAmountValue = component.paymentPlan.get('mtgAmount');
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(paymentPlanMtgAmountElement.value).toEqual(mtgAmountValue?.value)
      expect(mtgAmountValue?.errors).not.toBeNull();
      expect(mtgAmountValue?.errors?.['required']).toBeTruthy();
      done();
    })
  });


  it('Check form is valid when values are entered in input', () => {
    component.paymentPlan.setValue({
      mtgAmount: 500000,
      annualInterestRate: 5,
      amortizationPeriodYrs: 20,
      amortizationPeriodMonths: '',
      paymentFrequency: 12,
      term: 5,
      prepaymentPlanChecked: true,
      prepaymentPlan: ({
        prepaymentAmount: 5000,
        prepaymentFreq: 12
      })

    })
    const isFormValid = component.paymentPlan.valid
    expect(isFormValid).toEqual(true);

  });

  it('Check form is submitted successfully', () => {
    component.paymentPlan.setValue({
      mtgAmount: 500000,
      annualInterestRate: 5,
      amortizationPeriodYrs: 20,
      amortizationPeriodMonths: null,
      paymentFrequency: 12,
      term: 5,
      prepaymentPlanChecked: false,
      prepaymentPlan: ({
        prepaymentAmount: null,
        prepaymentFreq: null
      })
    })
    const calc = spyOn(component, 'calculate')
    const form = fixture.debugElement.query(By.css('form'))

    form.triggerEventHandler('ngSubmit', null);

    expect(calc).toHaveBeenCalled()
  });


  // it('Check form is not submitted and results table is populated', () => {
  //   component.paymentPlan.setValue({
  //     mtgAmount: 500000,
  //     annualInterestRate: 5,
  //     amortizationPeriodYrs: 20,
  //     amortizationPeriodMonths: null,
  //     paymentFrequency: 12,
  //     term: 5,
  //     prepaymentPlanChecked: false,
  //     prepaymentPlan: ({
  //       prepaymentAmount: null,
  //       prepaymentFreq: null
  //     })
  //   })
  //   const calc = spyOn(component, 'calculate')
  //   const form = fixture.debugElement.query(By.css('form'))
  //   form.triggerEventHandler('ngSubmit', null);
  //   expect(calc).toHaveBeenCalled()

  //   fixture.whenStable().then((done) => {
  //     let tableRows = fixture.nativeElement.querySelectorAll('mat-table')[0]
  //     //.querySelectorAll('mat-header-row')
  //     //.querySelectorAll('mat-header-cell')
  //     console.log(tableRows)
  //     console.log(tableRows.length)

  //     expect(tableRows.length).toBe(3);
  //     done();

  //   })
  // });

});
