/**
 * @fileoverview Guest Count Financial Simulation Card.
 * Allows deterministic recalculation of variable guest expenses.
 * @module components/budget/GuestSimulationCard
 */

import React from 'react';
import { GuestSimulationResult } from './types';
import { formatMoney } from './BudgetSummaryCards';

export interface GuestSimulationCardProps {
  newGuestCount: number;
  onChangeGuestCount: (count: number) => void;
  onSimulate: () => void;
  isSimulating: boolean;
  simulationResult: GuestSimulationResult | null;
  currency: string;
}

export function GuestSimulationCard({
  newGuestCount,
  onChangeGuestCount,
  onSimulate,
  isSimulating,
  simulationResult,
  currency,
}: GuestSimulationCardProps) {
  return (
    <div className="bg-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
      <h2 className="text-lg font-bold text-white mb-2">Guest Count Financial Simulation</h2>
      <p className="text-xs text-stone-400 mb-6 max-w-xl">
        Simulate how scaling or reducing guest attendance recalculates variable per-guest catering, seating, and floral allocations deterministically.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-64">
          <label htmlFor="sim-guests" className="block text-xs font-semibold text-stone-300 mb-1">
            Hypothetical Guest Count
          </label>
          <input
            id="sim-guests"
            type="number"
            min="10"
            max="5000"
            value={newGuestCount}
            onChange={(e) => onChangeGuestCount(Number(e.target.value))}
            className="w-full px-3.5 py-2 rounded-lg bg-stone-800 border border-stone-700 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onSimulate}
          disabled={isSimulating}
          className="mt-5 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md transition-colors"
        >
          {isSimulating ? 'Calculating...' : 'Run Simulation'}
        </button>
      </div>

      {simulationResult && (
        <div className="mt-6 pt-6 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-stone-800/80">
            <span className="text-stone-400 block">Baseline Guest Count:</span>
            <span className="text-base font-bold text-white mt-1 block">
              {simulationResult.baselineGuestCount} guests
            </span>
          </div>
          <div className="p-4 rounded-xl bg-stone-800/80">
            <span className="text-stone-400 block">Forecasted Expenditure:</span>
            <span className="text-base font-bold text-amber-400 mt-1 block">
              {formatMoney(simulationResult.simulatedTotalMinor, currency)}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-stone-800/80">
            <span className="text-stone-400 block">Estimated Variance:</span>
            <span className="text-base font-bold text-emerald-400 mt-1 block">
              {formatMoney(simulationResult.varianceMinor, currency)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

