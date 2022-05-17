import { Component, OnInit, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatTable } from '@angular/material/table';
import { ChartType, ChartOptions, ChartData, Legend, Chart, Title } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { atleastOneOf } from '../shared/custom-validators/atleast-one-of-validator';
import { termMoreThanAmort } from '../shared/custom-validators/greater-than-validator';

/* Constants  */
const maxYearsAmortization = 30;
const maxMonthsAmortization = 11;
const maxTerm = 10;
const monthsInAYear = 12;

/* Interface for Results object */
interface resultType {
  category: string;
  term: number;
  amortizationPeriod: number;
}

/* Interface for payment schedule object */
interface paymentSchedule {
  id: number;
  payment: number;
  principalPayment: number;
  interestPayment: number;
  outstandingBalance: number;
}

@Component({
  selector: 'app-mortgage-calculator',
  templateUrl: './mortgage-calculator.component.html',
  styleUrls: ['./mortgage-calculator.component.scss']
})

export class MortgageCalculatorComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  @ViewChild('resultsTable') resultsTable!: MatTable<any>;
  @ViewChild('amortizationTable') amortizationTable!: MatTable<any>;


  /* Form related Global variables */
  paymentPlan: FormGroup;
  //Global variables for select dropdown options
  yearOptions;
  monthOptions;
  paymentFreqOptions;
  termOptions;
  prepaymentFreqOptions;

  /* Mat table column definitions */
  resultsColumns: string[] = ['category', 'term', 'amortizationPeriod']
  amortizationTableColumns: string[] = ['id', 'payment', 'principalPayment', 'interestPayment', 'outstandingBalance']

  /* Global variables to hold calculation results arrays */
  resultsArray: resultType[] = [];
  paymentSchedule: paymentSchedule[] = [];

  /* Boolean for calculation status */
  calculationComplete = false;

  /*  Global Variables for Amortization calculation results */
  totalPrincipalAmortization = 0;
  totalInterestAmortization = 0
  totalCostAmortization = 0
  totalNumOfPaymentsAmortization = 0

  /* Global Variables for Term calculation results */
  totalPrincipalTerm = 0;
  totalInterestTerm = 0
  totalCostTerm = 0
  totalNumOfPaymentsTerm = 0

  /* Global Variables for mutual calculation results */
  paymentAmountPerPeriod = 0;

  /* Global Variables/Settings for pie chart */
  public pieChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false
  };
  public pieChartType: ChartType = 'pie';
  public pieChartLegend = true;
  public pieChartPlugins = [];
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Principal', 'Interest'],
    datasets: [{
      data: [],
      backgroundColor: ["#FFFFFF", "#ff9d00"],
      hoverBackgroundColor: ["#FFFFFF", "#ff9d00"],
      hoverBorderColor: ['white'],
      borderColor: ['#0B2B4B'],
      borderWidth: 1
    }],

  };

  constructor(private _formBuilder: FormBuilder,
  ) {
    /* Registering settings for pie chart */
    Chart.register(Legend);
    Chart.defaults.set('plugins.legend.labels', {
      color: '#FFFFFF',
    });
    Chart.defaults.set('plugins.legend', {
      position: 'bottom'
    })

    /*Initiating payment plan form*/
    this.paymentPlan = this._formBuilder.group({
      mtgAmount: ['', [Validators.required]],
      annualInterestRate: ['', Validators.required],
      amortizationPeriodYrs: [''],
      amortizationPeriodMonths: [],
      paymentFrequency: ['', Validators.required],
      term: ['', Validators.required],
      prepaymentPlanChecked: [false],
      prepaymentPlan: this._formBuilder.group({
        prepaymentAmount: [{ value: '', disabled: true }, [Validators.required]],
        prepaymentFreq: [{ value: '', disabled: true }, [Validators.required]]

      }),

    }, {
      /*Custom validator for ensuring at least of the the fields are filled in*/
      validator: [atleastOneOf("amortizationPeriodYrs", "amortizationPeriodMonths"), termMoreThanAmort("amortizationPeriodYrs", "amortizationPeriodMonths", "term")]
    });

    /* Intitializing select dropdown options for form */
    this.yearOptions = Array.from({ length: maxYearsAmortization }, (_, index) => index + 1)
    this.monthOptions = Array.from({ length: maxMonthsAmortization }, (_, index) => index + 1)
    this.paymentFreqOptions = [{ name: 'Weekly', value: 52 }, { name: 'Bi-Weekly(every 2 weeks)', value: 26 }, { name: 'Semi-monthly(24x per year)', value: 24 }, { name: 'Monthly(12x per year)', value: 12 }]
    this.termOptions = Array.from({ length: maxTerm }, (_, index) => index + 1)
    this.prepaymentFreqOptions = ['One time', 'Each year', 'Same as regular payment']
  }

  ngOnInit(): void {
    /* Set Default Form Values */
    this.paymentPlan.get('amortizationPeriodYrs')?.setValue(25);
    this.paymentPlan.get('paymentFrequency')?.setValue(24);
    this.paymentPlan.get('term')?.setValue(5);
    this.paymentPlan.get('mtgAmount')?.setValue(100000);
    this.paymentPlan.get('annualInterestRate')?.setValue(3);

    /* Calculate with default values on page load */
    this.calculate();
  }

  /* Method to disable/enable prepayment plan form on prepayment toggle */
  prepaymentToggle() {
    this.paymentPlan.get('prepaymentPlanChecked')?.value ? this.paymentPlan.get('prepaymentPlan')?.enable() : this.paymentPlan.get('prepaymentPlan')?.disable()
  }

  /* Calculate Function called on Form submission */
  calculate() {
    /* Return if form is invalid */
    if (this.paymentPlan.invalid) {
      return;
    }
    /* Set to hide results table and ammotization table while calculation is incomplete */
    this.calculationComplete = false;

    /* Calculate monthly interest rate */
    var monthlyInterestRate = this.calculateMonthlyInterestRate(this.paymentPlan.get('annualInterestRate')?.value ?? 0);

    /* Set local variable for mortgage amount */
    var mortgageAmount = this.paymentPlan.get('mtgAmount')?.value ?? 0

    /* Set local variable for payment frequency */
    var paymentFrequency = this.paymentPlan.get('paymentFrequency')?.value


    /* Calculate and set local variable for amortization period in months */
    var amortizationPeriodMonths = this.calculateTotalAmortizationMonths(this.paymentPlan.get('amortizationPeriodYrs')?.value ?? 0, this.paymentPlan.get('amortizationPeriodMonths')?.value ?? 0)

    /* Calculate total number of payments for amortization period given amortization in months and payment frequency selected*/
    this.calculateNumOfPaymentsAmortization(amortizationPeriodMonths, paymentFrequency)

    /* Calculate payment amount for frequency selected */
    this.paymentAmountPerPeriod = this.calculatePMT(mortgageAmount, monthlyInterestRate, amortizationPeriodMonths, paymentFrequency)

    /* 
    Amortization calculations
    */

    /* Calculate nominal rate */
    var nominalRate = this.calculateNominalRate(this.paymentPlan.get('annualInterestRate')?.value ?? 0, this.paymentPlan.get('paymentFrequency')?.value)


    /* Calculate amortization values and schedule*/
    this.calculateAmortizationSchedule(nominalRate, mortgageAmount, this.totalNumOfPaymentsAmortization, this.paymentAmountPerPeriod)

    /* Calculate total Interest paid for amortization period */
    this.calculateTotalInterestAmortization();

    /*  Calculate total Principal paid for amortization period*/
    this.calculateTotalPrincipalAmortization()

    /* Calculate total cost for amortization period */
    this.totalCostAmortization = this.calculateTotalCost(this.totalInterestAmortization, this.totalPrincipalAmortization)


    /* 
    Term calculations
    */
    /* Calculate total number of payments for term period */
    this.numberOfpaymentsForTerm()

    /* Calculate total Interest, Pricipal, Cost for term*/
    console.log(this.totalNumOfPaymentsTerm)
    this.calculateTermPayments(this.totalNumOfPaymentsTerm)

    /* Resest results table datasource */
    this.resultsArray.length = 0;
    /* Push values to results table datasource */
    this.resultsArray.push({ 'category': 'Number of Payments', 'term': this.totalNumOfPaymentsTerm, 'amortizationPeriod': this.totalNumOfPaymentsAmortization })
    this.resultsArray.push({ 'category': 'Mortgage Payment', 'term': this.paymentAmountPerPeriod, 'amortizationPeriod': this.paymentAmountPerPeriod })
    this.resultsArray.push({ 'category': 'Principal Payments', 'term': this.totalPrincipalTerm, 'amortizationPeriod': mortgageAmount })
    this.resultsArray.push({ 'category': 'Interest Payments', 'term': this.totalInterestTerm, 'amortizationPeriod': this.totalInterestAmortization })
    this.resultsArray.push({ 'category': 'Total Cost', 'term': this.totalCostTerm, 'amortizationPeriod': this.totalCostAmortization })

    /* Call function to refresh results table values on UI */
    this.refreshMatTable(this.resultsTable)

    /* Set pie chart data values for total interest and mortgage amount over amortization period */
    this.pieChartData.datasets[0].data[1] = this.totalInterestAmortization
    this.pieChartData.datasets[0].data[0] = mortgageAmount

    /* Call method to refresh and update pie chart data on UI */
    this.chart?.update()

    /* Set calculation complete to true to show results table on UI */
    this.calculationComplete = true;
  }

  /*******************************************
   * 
   * Functions definitions
   * 
   *******************************************/

  /* Function to refresh mat table rows given mat table */
  refreshMatTable(table: any) {
    table?.renderRows();
  }


  /* Function to calculate the periodic payment for loan (PMT equation) */
  calculatePMT(mortgageAmount: number, monthlyInterestRate: number, totalPayments: number, paymentFrequency: number) {
    var paymentAmt = (mortgageAmount - (0 / Math.pow((1 + monthlyInterestRate), totalPayments))) / ((1 - (1 / Math.pow((1 + monthlyInterestRate), totalPayments))) / monthlyInterestRate)
    switch (paymentFrequency) {
      case 12:
        break;
      case 24:
        paymentAmt = paymentAmt / 2
        break;
      case 26:
        paymentAmt = (paymentAmt * 12) / paymentFrequency
        break;
      case 52:
        paymentAmt = (paymentAmt * 12) / paymentFrequency
        break;
      default:
        totalPayments = 0;
    }
    return parseFloat(paymentAmt.toFixed(2))
  }


  /* Function to calculate total amortization in months */
  calculateTotalAmortizationMonths(numOfYears: number, numOfMonths: number) {
    return (numOfYears * monthsInAYear) + numOfMonths
  }


  /* Function to calculate the total number of payments for the amortization period */
  calculateNumOfPaymentsAmortization(totalMonths: number, paymentFrequency: number) {
    var remainder = 0
    switch (paymentFrequency) {
      case 12:
        this.totalNumOfPaymentsAmortization = totalMonths
        break;
      case 24:
        this.totalNumOfPaymentsAmortization = totalMonths * 2
        break;
      case 26:
        remainder = totalMonths % 12
        this.totalNumOfPaymentsAmortization = ((totalMonths - remainder) / 12) * 26
        if (remainder > 0) {
          this.totalNumOfPaymentsAmortization += remainder * 2
        }
        break;
      case 52:
        remainder = totalMonths % 12
        this.totalNumOfPaymentsAmortization = ((totalMonths - remainder) / 12) * 52
        if (remainder > 0) {
          this.totalNumOfPaymentsAmortization += remainder * 4
        }
        break;
      default:
        this.totalNumOfPaymentsAmortization = 0;
    }
  }


  /* Function to calculate amortization schedule given values and set the amortization table datasource */
  calculateAmortizationSchedule(nominalRate: number, mortgageAmount: number, numOfPayments: number, paymentAmount: number) {

    /* Reset amortization table datasource to empty*/
    this.paymentSchedule.length = 0;

    /* Intialize remaining balance as total mortgage amount */
    var remainingBalance = mortgageAmount

    /* Loop through number of payments and subtract interest from the mortgage balance for each payment.
    During each iteration the interest is calculated again.
     */
    for (var i = 0; i < numOfPayments; i++) {
      var interest = parseFloat((remainingBalance * (nominalRate / 100)).toFixed(2))
      remainingBalance += interest

      /* If the remaining balance is less than the payment amount the final payment amount is the remaining balance */
      if (remainingBalance < paymentAmount) {
        var payment = remainingBalance
        var principle = (remainingBalance - interest);
      }
      /* Else calculate payment amount and principal amount */
      else {
        var payment = paymentAmount
        var principle = (paymentAmount - interest);
      }
      /* Update the remaining balance by subtracting total payment */
      remainingBalance -= payment

      /* Push values into payment schedule datasource if remaining balance is greater than or equal to 0*/
      if (remainingBalance >= 0) {
        this.paymentSchedule.push({ id: i, payment: (payment > 0 ? parseFloat(payment.toFixed(2)) : 0), principalPayment: (principle > 0 ? parseFloat(principle.toFixed(2)) : 0), interestPayment: (interest > 0 ? parseFloat(interest.toFixed(2)) : 0), outstandingBalance: (remainingBalance > 0 ? parseFloat(remainingBalance.toFixed(2)) : 0) })
      }
    }

    /* After populating payment schedule array refresh the amortization table rows */
    this.refreshMatTable(this.amortizationTable)
  }


  /* Function to calculate the nominal rate given the annual interest rate and number of payments/year  */
  calculateNominalRate(annualInterestRate: number, numOfPaymentsPerYear: number) {
    var nominalRate = (numOfPaymentsPerYear * ((Math.pow((1 + (annualInterestRate / 100)), (1 / numOfPaymentsPerYear))) - 1) * 100) / numOfPaymentsPerYear
    return parseFloat(nominalRate.toFixed(5))
  }


  /* Function to calculate monthly interest rate given annual interest rate */
  calculateMonthlyInterestRate(annualInterestRate: number) {
    return ((annualInterestRate / 100)) / monthsInAYear
  }


  /* Function to calculate total cost for period given total interest and total principal */
  calculateTotalCost(totalInterest: number, totalPrincipal: number) {
    return totalInterest + totalPrincipal
  }


  /* Function to calculate total interest amount for amortization period using amortization schedule */
  calculateTotalInterestAmortization() {
    this.totalInterestAmortization = 0;
    this.paymentSchedule.forEach((item) => {
      this.totalInterestAmortization += item.interestPayment
    })
  }


  /* Function to calculate total principal amount for amortization period using amortization schedule */
  calculateTotalPrincipalAmortization() {
    this.totalPrincipalAmortization = 0;
    this.paymentSchedule.forEach((item) => {
      this.totalPrincipalAmortization += item.principalPayment
    })
  }


  /* Function to calculate the total number of payments for the selected term */
  numberOfpaymentsForTerm() {
    var totalPayments = (this.paymentPlan.get('term')?.value ?? 0)
    var paymentFrequency = this.paymentPlan.get('paymentFrequency')?.value
    switch (paymentFrequency) {
      case 52:
        this.totalNumOfPaymentsTerm = totalPayments * paymentFrequency
        break;
      case 26:
        this.totalNumOfPaymentsTerm = totalPayments * paymentFrequency
        break;
      case 24:
        this.totalNumOfPaymentsTerm = totalPayments * paymentFrequency
        break;
      case 12:
        this.totalNumOfPaymentsTerm = totalPayments * paymentFrequency
        break;
      default:
        this.totalNumOfPaymentsTerm = 0
    }
  }

  /* Function to calculate term payment values. 
    Including total principal paid, total interest paid, total cost over term period 
    */
  calculateTermPayments(numOfPaymentsForTerm: number) {
    /* Reset values to 0 */
    this.totalPrincipalTerm = 0;
    this.totalInterestTerm = 0;
    this.totalCostTerm = 0;
    /* Iterate over payment schedule and sum values */
    for (let i = 0; i < numOfPaymentsForTerm; i++) {
      this.totalPrincipalTerm += this.paymentSchedule[i]?.principalPayment
      this.totalInterestTerm += this.paymentSchedule[i]?.interestPayment
      this.totalCostTerm += this.paymentSchedule[i]?.payment
    }
  }
}
