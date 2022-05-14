import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatTable } from '@angular/material/table';
import { ChartType, ChartOptions, ChartData, Legend, Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { atleastOneOf } from '../shared/custom-validators/atleast-one-of-validator';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { NONE_TYPE } from '@angular/compiler';
const maxYearsAmmortization = 30;
const maxMonthsAmmortization = 11;
const maxTerm = 10;
const resultCategorys = ['Number of Payments', 'Mortgage Payment', 'Prepayment', 'Principal Payments', 'Interest Payments', 'Total Cost']
const monthsInAYear = 12;
const weeksInAYear = 52;

interface resultType {
  category: string;
  term: number;
  amortizationPeriod: number;
}

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
  @ViewChild(MatTable) resultsTable!: MatTable<any>;
  @ViewChild(MatTable) ammortizationTable!: MatTable<any>;

  paymentPlan: FormGroup;
  yearOptions;
  monthOptions;
  paymentFreqOptions;
  termOptions;
  prepaymentFreqOptions;
  resultsColumns: string[] = ['category', 'term', 'amortizationPeriod']
  ammortizationTableColumns: string[] = ['id', 'payment', 'principalPayment', 'interestPayment', 'outstandingBalance']
  resultsArray: resultType[] = [];
  calculationComplete = false;
  paymentSchedule: paymentSchedule[] = [];
  totalInterestAmount = 0;
  totalCost = 0;

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
      backgroundColor: ["#FFFFFF", "#f39c12"],
      hoverBackgroundColor: ["#FFFFFF", "#f39c12"],
      hoverBorderColor: ['white'],
      borderColor: ['black'],
      borderWidth: 1



    }],

  };

  constructor(private _formBuilder: FormBuilder,
  ) {
    Chart.register(Legend);
    Chart.defaults.set('plugins.legend.labels', {
      color: '#FFFFFF',
    });

    this.paymentPlan = this._formBuilder.group({
      mtgAmount: ['', [Validators.required]],
      interestRate: ['', Validators.required],
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
      // Used custom form validator name
      validator: atleastOneOf("amortizationPeriodYrs", "amortizationPeriodMonths")
    });
    this.yearOptions = Array.from({ length: maxYearsAmmortization }, (_, index) => index + 1)
    this.monthOptions = Array.from({ length: maxMonthsAmmortization }, (_, index) => index + 1)
    this.paymentFreqOptions = [{ name: 'Weekly', value: 52 }, { name: 'Bi-Weekly(every 2 weeks)', value: 26 }, { name: 'Semi-monthly(24x per year)', value: 24 }, { name: 'Monthly(12x per year)', value: 12 }]
    this.termOptions = Array.from({ length: maxTerm }, (_, index) => index + 1)
    this.prepaymentFreqOptions = ['One time', 'Each year', 'Same as regular payment']

    // this.prepaymentPlan = this._formBuilder.group({
    //   prepaymentAmount: ['', [Validators.required]],
    //   prepaymentFreq: ['', [Validators.required]]
    // });
  }

  ngOnInit(): void {
    //Set Default Values
    this.paymentPlan.get('amortizationPeriodYrs')?.setValue(25);
    this.paymentPlan.get('paymentFrequency')?.setValue(24);
    this.paymentPlan.get('term')?.setValue(5);
    this.paymentPlan.get('mtgAmount')?.setValue(100000);
    this.paymentPlan.get('interestRate')?.setValue(3);


    //Calculate Default
    this.calculate();

  }

  prepaymentToggle() {
    this.paymentPlan.get('prepaymentPlanChecked')?.value ? this.paymentPlan.get('prepaymentPlan')?.enable() : this.paymentPlan.get('prepaymentPlan')?.disable()
  }

  calculate() {
    if (this.paymentPlan.invalid) {
      return;
    }
    this.calculationComplete = false;
    console.log("SUBMITTED")
    let numberOfPaymentsTerm = this.numberOfPaymentsTerm()
    console.log("terms: ", numberOfPaymentsTerm)
    // let numberOfPaymentsAmmortization = 
    let numberOfPaymentsAmmortization = this.numberOfPaymentsAmmortization();
    console.log("amm: ", numberOfPaymentsAmmortization)
    this.calculationComplete = true;
    // this.monthlyMortgagePayment()
    // this.weeklyMortgagePayment()
    var paymentAmount = parseFloat(this.pmt())
    // this.compoundInterest()
    var numOfPaymentsPerYear = this.paymentPlan.get('paymentFrequency')?.value
    var numberOfPayments = this.totalPayments()
    var annualInterestRate = this.paymentPlan.get('interestRate')?.value
    var monthlyInterestRate = ((this.paymentPlan.get('interestRate')?.value / 100)) / monthsInAYear
    var mortgageAmount = this.paymentPlan.get('mtgAmount')?.value
    var nominalRate = this.nominalRate(annualInterestRate, numOfPaymentsPerYear)
    console.log("paymentAmount: ", paymentAmount)
    console.log("numberOfPayments: ", numberOfPayments)
    console.log("monthlyInterestRate: ", monthlyInterestRate)

    this.calculateSchedule(nominalRate, mortgageAmount, numberOfPayments, monthlyInterestRate, paymentAmount)
    this.totalInterestPaid();
    this.totalPrincipalPaid()
    this.totalCost = this.totalInterestAmount + mortgageAmount
    this.resultsArray.length = 0;
    this.resultsArray.push({ 'category': 'Number of Payments', 'term': numberOfPayments, 'amortizationPeriod': numberOfPayments })
    this.resultsArray.push({ 'category': 'Mortgage Payment', 'term': paymentAmount, 'amortizationPeriod': paymentAmount })
    this.resultsArray.push({ 'category': 'Principal Payments', 'term': mortgageAmount, 'amortizationPeriod': mortgageAmount })
    this.resultsArray.push({ 'category': 'Interest Payments', 'term': this.totalInterestAmount, 'amortizationPeriod': this.totalInterestAmount })
    this.resultsArray.push({ 'category': 'Total Cost', 'term': this.totalCost, 'amortizationPeriod': this.totalCost })

    // let pieDataSet = new chartData
    this.pieChartData.datasets[0].data[1] = this.totalInterestAmount
    this.pieChartData.datasets[0].data[0] = mortgageAmount
    this.chart?.update()
    //   datasets.data.push()

    // push([this.totalInterestAmount])
    this.refreshAllMatResultsTable()


  }

  refreshAllMatResultsTable() {
    this.resultsTable?.renderRows();
  }
  numberOfPaymentsTerm() {
    let paymentFrequency = this.paymentPlan.get('paymentFrequency')?.value
    let term = this.paymentPlan.get('term')?.value
    return paymentFrequency * term

  }



  numberOfPaymentsAmmortization() {
    let ammortizationYrs = this.paymentPlan.get('amortizationPeriodYrs')?.value
    let ammortizaionMonths = this.paymentPlan.get('amortizationPeriodMonths')?.value
    let paymentFrequency = this.paymentPlan.get('paymentFrequency')?.value
    let totalPaymentsYrs = ammortizationYrs * paymentFrequency
    let totalPaymentsMonths;
    switch (paymentFrequency) {
      case 52:
        console.log("52")
        totalPaymentsMonths = Math.ceil(paymentFrequency / 12 * ammortizaionMonths)

        break;
      case 26:
        console.log("26")
        totalPaymentsMonths = Math.ceil(paymentFrequency / 12 * ammortizaionMonths)

        break;

      case 24:
        console.log("24")
        totalPaymentsMonths = Math.ceil(paymentFrequency / 12 * ammortizaionMonths)
        break;

      case 12:
        console.log("12")
        totalPaymentsMonths = Math.ceil(paymentFrequency / 12 * ammortizaionMonths)
        break;
      default:
        totalPaymentsMonths = 0
    }
    return totalPaymentsYrs + totalPaymentsMonths
  }


  monthlyMortgagePayment() {
    let monthlyInterestRate = ((this.paymentPlan.get('interestRate')?.value / 100)) / monthsInAYear
    let numberOfPayments = this.paymentPlan.get('term')?.value * monthsInAYear
    let mortgageAmount = this.paymentPlan.get('mtgAmount')?.value
    let monthlyPayment = (mortgageAmount * ((monthlyInterestRate * (Math.pow(1 + monthlyInterestRate, numberOfPayments))) / ((Math.pow(1 + monthlyInterestRate, numberOfPayments)) - 1))).toFixed(2)
    console.log(monthlyInterestRate)
    console.log(this.paymentPlan.get('interestRate')?.value)
    console.log("monthyl payment: ", monthlyPayment)
  }

  weeklyMortgagePayment() {
    let mortgageAmount = this.paymentPlan.get('mtgAmount')?.value
    let paymentFrequency = this.paymentPlan.get('paymentFrequency')?.value
    let weeklyInterestRate = ((this.paymentPlan.get('interestRate')?.value / 100)) / paymentFrequency
    let numberOfPayments = this.paymentPlan.get('term')?.value * paymentFrequency
    let weeklyPayment = (mortgageAmount * ((weeklyInterestRate * (Math.pow(1 + weeklyInterestRate, numberOfPayments))) / ((Math.pow(1 + weeklyInterestRate, numberOfPayments)) - 1))).toFixed(2)
    console.log(weeklyInterestRate)
    console.log(this.paymentPlan.get('interestRate')?.value)
    console.log("weeklyPayment : ", weeklyPayment)


  }

  pmt() {
    let mortgageAmount = this.paymentPlan.get('mtgAmount')?.value
    let monthlyInterestRate = ((this.paymentPlan.get('interestRate')?.value / 100)) / monthsInAYear
    let ammortizationYrs = this.paymentPlan.get('amortizationPeriodYrs')?.value * monthsInAYear
    let ammortizaionMonths = this.paymentPlan.get('amortizationPeriodMonths')?.value
    let totalPayments = ammortizationYrs + ammortizaionMonths
    let paymentFrequency = this.paymentPlan.get('paymentFrequency')?.value
    let paymentAmt = (mortgageAmount - (0 / Math.pow((1 + monthlyInterestRate), totalPayments))) / ((1 - (1 / Math.pow((1 + monthlyInterestRate), totalPayments))) / monthlyInterestRate)
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
    return (paymentAmt.toFixed(2))
  }

  compoundInterest() {
    let mortgageAmount = parseInt(this.paymentPlan.get('mtgAmount')?.value)
    let monthlyInterestRate = ((this.paymentPlan.get('interestRate')?.value / 100)) / monthsInAYear
    let annualInterestRate = (this.paymentPlan.get('interestRate')?.value / 100)
    let ammortizationYrs = this.paymentPlan.get('amortizationPeriodYrs')?.value
    let ammortizaionMonths = this.paymentPlan.get('amortizationPeriodMonths')?.value
    let totalPayments = parseInt(ammortizationYrs + ammortizaionMonths)

    let amt = mortgageAmount * (Math.pow((1 + (annualInterestRate / 12)), (12 * ammortizationYrs)))
    let compountInterest = amt - mortgageAmount
    console.log("compountInterest: ", compountInterest)

  }

  totalPayments() {
    let totalMonths = (this.paymentPlan.get('amortizationPeriodYrs')?.value * monthsInAYear) + this.paymentPlan.get('amortizationPeriodMonths')?.value
    let paymentFrequency = this.paymentPlan.get('paymentFrequency')?.value
    let totalPayments;
    let remainder
    switch (paymentFrequency) {
      case 12:
        totalPayments = totalMonths
        break;
      case 24:
        totalPayments = totalMonths * 2
        break;
      case 26:
        remainder = totalMonths % 12
        totalPayments = ((totalMonths - remainder) / 12) * 26
        if (remainder > 0) {
          totalPayments += remainder * 2
        }
        break;
      case 52:
        remainder = totalMonths % 12
        totalPayments = ((totalMonths - remainder) / 12) * 52
        if (remainder > 0) {
          totalPayments += remainder * 4
        }
        break;
      default:
        totalPayments = 0;
    }
    return totalPayments
  }

  calculateSchedule(nominalRate: number, mortgageAmount: number, numOfPayments: number, monthlyInterestRate: number, paymentAmount: number) {
    this.paymentSchedule.length = 0;
    var remainingBalance = mortgageAmount

    for (var i = 0; i < numOfPayments; i++) {
      var interest = remainingBalance * (nominalRate / 100)
      console.log(interest)
      remainingBalance += interest



      if (remainingBalance < paymentAmount) {
        var payment = remainingBalance
        var principle = (remainingBalance - interest);

      }
      else {
        var payment = paymentAmount
        var principle = (paymentAmount - interest);
      }
      remainingBalance -= payment
      var principalPayment = principle > 0 ? parseFloat(principle.toFixed(2)) : 0
      var id = i
      var interestPayment = interest > 0 ? parseFloat(interest.toFixed(2)) : 0
      var outstandingBalance = remainingBalance > 0 ? parseFloat(remainingBalance.toFixed(2)) : 0



      this.paymentSchedule.push({ id: id, payment: payment, principalPayment: principalPayment, interestPayment: interestPayment, outstandingBalance: outstandingBalance })

    }
    console.log("schedule: ", this.paymentSchedule)
    this.ammortizationTable?.renderRows();

  }

  nominalRate(annualInterestRate: number, numOfPaymentsPerYear: number) {
    var nominalRate = (numOfPaymentsPerYear * ((Math.pow((1 + (annualInterestRate / 100)), (1 / numOfPaymentsPerYear))) - 1) * 100) / numOfPaymentsPerYear
    console.log(nominalRate)
    return nominalRate
  }


  totalInterestPaid() {
    this.totalInterestAmount = 0;
    this.paymentSchedule.forEach((item) => {
      this.totalInterestAmount += item.interestPayment
    })
    console.log("totalInterest: ", this.totalInterestAmount)
  }
  totalPrincipalPaid() {
    var totalPrincipal = 0;
    this.paymentSchedule.forEach((item) => {
      totalPrincipal += item.principalPayment
    })
    console.log("totalPrincipal: ", totalPrincipal)
  }

  // events


  public chartHovered({ event, active }: { event: MouseEvent, active: {}[] }): void {
    console.log(event, active);
  }

}
