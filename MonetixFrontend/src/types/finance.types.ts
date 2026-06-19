export type TransactionType = 'income' | 'expense';
export type GoalStatus = 'active' | 'completed' | 'cancelled';
export type GoalType = 'savings' | 'expense';
export type AlertSeverity = 'low' | 'medium' | 'high';
export type AlertPriority = 'low' | 'medium' | 'high';
export type AlertType = 'warning' | 'info' | 'success' | 'error';

export interface Category {
    id?: string;
    _id?: string; // MongoDB uses _id
    name: string;
    type: TransactionType;
    icon?: string;
    color?: string;
    description?: string;
    isDefault: boolean;
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Transaction {
    id?: string;
    _id?: string; // MongoDB uses _id
    categoryId: string | Category; // Can be ID string or populated Category object
    category?: Category; // Populated category data
    amount: number;
    type: TransactionType;
    description?: string;
    date: string;
    userId: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Goal {
    id?: string;
    _id?: string; // MongoDB uses _id
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string; // API uses 'targetDate'
    description?: string;
    status: GoalStatus;
    // type field removed as it is not in the backend model
    progress?: number; // API returns calculated progress percentage
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Prediction {
    id?: string;
    _id?: string;
    userId?: string;
    type: 'income' | 'expense' | 'net'; // API uses 'type' for income/expense
    categoryId?: string | Category; // Can be ID or populated
    model?: string; // Model used for prediction
    modelType?: string; // Model type used (linear_regression, etc.)
    accuracy?: number; // Prediction accuracy
    confidence?: number; // Overall confidence level (0-1)
    predictions: {
        date: string; // Date of prediction (ISO format)
        amount: number; // Predicted amount
        lowerBound?: number; // Lower confidence bound
        upperBound?: number; // Upper confidence bound
        confidence?: number; // 0-1 confidence level
    }[];
    createdAt?: string;
    updatedAt?: string;
}

export interface Alert {
    id?: string;
    _id?: string; // MongoDB uses _id
    userId?: string;
    type: 'overspending' | 'goal_progress' | 'unusual_pattern' | 'recommendation';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    isRead: boolean;
    relatedData?: any;
    createdAt?: string;
}

export interface CategoryStats {
    categoryId: string;
    categoryName: string;
    totalAmount: number;
    percentage: number;
    transactionCount: number;
    color?: string;
}

export interface ComparisonData {
    category: string;
    currentPeriod: number;
    previousPeriod: number;
    changePercentage: number;
}

// Goal Projection Type (from API /goals/:id/projection)
export interface GoalProjection {
    goalId: string;
    currentAmount: number;
    targetAmount: number;
    remainingAmount: number;
    daysRemaining: number;
    dailyRequiredSavings: number;
    monthlyRequiredSavings: number;
    projectedCompletionDate: string;
    onTrack: boolean;
    estimatedCompletion?: string;
}

// Transaction Statistics Type (from API /transactions/statistics)
export interface TransactionStatistics {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
    averageIncome: number;
    averageExpense: number;
    topCategory?: {
        _id: string;
        name: string;
        total: number;
    };
}

// Transaction by Category (from API /transactions/by-category)
export interface TransactionByCategory {
    category: {
        _id: string;
        name: string;
        icon?: string;
        color?: string;
    };
    total: number;
    count: number;
    percentage: number;
}

// Transaction by Period (from API /transactions/by-period)
export interface TransactionByPeriod {
    period: string; // Format depends on period type (day/week/month/year)
    income: number;
    expense: number;
    balance: number;
    count: number;
}

// Prediction Insights (from API /predictions/insights)
export interface PredictionInsights {
    nextMonthIncome: number;
    nextMonthExpense: number;
    projectedBalance: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    recommendations: string[];
    risks: string[];
}
