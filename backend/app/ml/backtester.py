import pandas as pd
import numpy as np
from typing import Dict, Any, List

class Backtester:
    """
    Simulates historical trading execution based on signal inputs.
    Calculates Sharpe Ratio, Max Drawdown, Win Rate, and Profit Factor metrics.
    """

    @staticmethod
    def run_backtest(
        df: pd.DataFrame, signals: List[int], initial_balance: float = 10000.0, leverage: float = 30.0
    ) -> Dict[str, Any]:
        """
        Executes a backtest on a dataframe containing close prices.
        signals: List of integer actions (1 = Long, -1 = Short, 0 = Hold)
        """
        if len(df) != len(signals):
            raise ValueError("Dataframe length does not match signals length.")

        balance = initial_balance
        equity_curve = [balance]
        wins = 0
        losses = 0
        gross_profit = 0.0
        gross_loss = 0.0
        
        position = 0 # 0 = flat, 1 = long, -1 = short
        entry_price = 0.0

        for i in range(1, len(df)):
            close_price = df.loc[i, "close"]
            prev_close = df.loc[i-1, "close"]
            signal = signals[i-1]

            # Re-evaluate open positions first
            if position != 0:
                # Calculate profit ratio
                pnl_factor = (close_price - prev_close) / prev_close
                trade_pnl = balance * pnl_factor * leverage * position
                
                # Check stop-loss / take-profit margins check simulated limits
                if (position == 1 and close_price < entry_price * 0.98) or (position == -1 and close_price > entry_price * 1.02):
                    # SL hit, close trade
                    trade_pnl = balance * -0.02 * leverage * position # 2% loss max cap
                    balance += trade_pnl
                    position = 0
                    losses += 1
                    gross_loss += abs(trade_pnl)
                elif (position == 1 and close_price > entry_price * 1.04) or (position == -1 and close_price < entry_price * 0.96):
                    # TP hit
                    trade_pnl = balance * 0.04 * leverage * position
                    balance += trade_pnl
                    position = 0
                    wins += 1
                    gross_profit += trade_pnl
                else:
                    # Hold
                    balance += trade_pnl
                    if trade_pnl > 0:
                        gross_profit += trade_pnl
                    else:
                        gross_loss += abs(trade_pnl)
                    
            # Check for new signals
            if position == 0 and signal != 0:
                position = signal
                entry_price = close_price

            equity_curve.append(balance)

        # Compute summary statistics
        equity_df = pd.Series(equity_curve)
        returns = equity_df.pct_change().dropna()
        
        # 1. Total return
        total_return = (balance - initial_balance) / initial_balance

        # 2. Sharpe Ratio
        std_dev = returns.std()
        sharpe_ratio = (returns.mean() / std_dev * np.sqrt(252)) if std_dev > 0 else 0.0

        # 3. Max Drawdown
        roll_max = equity_df.cummax()
        drawdowns = (equity_df - roll_max) / roll_max
        max_drawdown = drawdowns.min()

        # 4. Profit Factor
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 1.0 if gross_profit > 0 else 0.0

        # 5. Win Rate
        total_trades = wins + losses
        win_rate = wins / total_trades if total_trades > 0 else 0.0

        return {
            "initial_balance": initial_balance,
            "final_balance": balance,
            "total_return": float(total_return),
            "win_rate": float(win_rate),
            "profit_factor": float(profit_factor),
            "sharpe_ratio": float(sharpe_ratio),
            "max_drawdown": float(max_drawdown),
            "total_trades": total_trades,
            "equity_curve": equity_curve
        }
