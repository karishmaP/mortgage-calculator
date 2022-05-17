import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MortgageCalculatorComponent } from './mortgage-calculator/mortgage-calculator.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mortgage-calculator' },
  { path: 'mortgage-calculator', component: MortgageCalculatorComponent },


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
