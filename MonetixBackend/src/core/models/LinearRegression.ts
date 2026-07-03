import {
  IPredictionModel,
  TimeSeriesData,
  PredictionResult,
  ModelMetadata,
} from '../interfaces/PredictionModel';
import { StatisticalTests } from '../utils/statisticalTests';

export class LinearRegressionModel implements IPredictionModel {
  private coefficients: number[] = [];
  private intercept: number = 0;
  private rSquared: number = 0;
  private trainedValues: number[] = [];
  private trainedDates: Date[] = [];
  private meanAbsoluteError: number = 0;
  private rootMeanSquaredError: number = 0;
  private lastValue: number = 0;
  private lastDate: Date = new Date();

  train(data: TimeSeriesData): void {
    if (data.values.length < 2) {
      throw new Error('Se necesitan al menos 2 puntos de datos para entrenar el modelo');
    }

    this.trainedValues = [...data.values];
    this.trainedDates = [...data.dates];
    this.lastValue = data.values[data.values.length - 1];
    this.lastDate = data.dates[data.dates.length - 1];

    const sampleSize = data.values.length;
    const xValues = Array.from({ length: sampleSize }, (_, i) => i);
    const yValues = data.values;

    const designMatrix = this.createDesignMatrix(xValues);
    const beta = this.computeCoefficients(designMatrix, yValues);

    this.intercept = beta[0];
    this.coefficients = beta.slice(1);

    const predictions = this.predictFromX(xValues);
    this.rSquared = StatisticalTests.rSquared(yValues, predictions);
    this.meanAbsoluteError = StatisticalTests.meanAbsoluteError(yValues, predictions);
    this.rootMeanSquaredError = StatisticalTests.rootMeanSquaredError(yValues, predictions);
  }

  predict(periods: number): PredictionResult[] {
    if (this.trainedValues.length === 0) {
      throw new Error('El modelo debe ser entrenado antes de hacer predicciones');
    }

    const results: PredictionResult[] = [];
    const sampleSize = this.trainedValues.length;
    const confidenceInterval = StatisticalTests.confidenceInterval(this.trainedValues, 0.95);
    const intervalWidth = confidenceInterval.upper - confidenceInterval.lower;

    for (let i = 1; i <= periods; i++) {
      const xValue = sampleSize + i - 1;
      const predicted = this.predictValue(xValue);

      const uncertainty = intervalWidth * Math.sqrt(1 + i / sampleSize);
      const lowerBound = Math.max(0, predicted - uncertainty);
      const upperBound = predicted + uncertainty;

      const date = new Date(this.lastDate);
      date.setMonth(date.getMonth() + i);

      results.push({
        date,
        amount: Math.max(0, predicted),
        lowerBound,
        upperBound,
      });
    }

    return results;
  }

  getConfidence(): number {
    return Math.max(0, Math.min(1, this.rSquared));
  }

  getMetadata(): ModelMetadata {
    return {
      name: 'Linear Regression',
      parameters: {
        intercept: this.intercept,
        coefficients: this.coefficients,
      },
      trainingSamples: this.trainedValues.length,
      rSquared: this.rSquared,
      meanAbsoluteError: this.meanAbsoluteError,
      rootMeanSquaredError: this.rootMeanSquaredError,
      complexity: 'O(n³)',
    };
  }

  private createDesignMatrix(xValues: number[]): number[][] {
    const sampleSize = xValues.length;
    const designMatrix: number[][] = [];

    for (let i = 0; i < sampleSize; i++) {
      designMatrix.push([1, xValues[i], xValues[i] * xValues[i]]);
    }

    return designMatrix;
  }

  private computeCoefficients(designMatrix: number[][], yValues: number[]): number[] {
    const matrixTransposed = this.transpose(designMatrix);
    const XtX = this.multiplyMatrices(matrixTransposed, designMatrix);
    const Xty = this.multiplyMatrixVector(matrixTransposed, yValues);

    const XtX_inv = this.inverseMatrix(XtX);
    const beta = this.multiplyMatrixVector(XtX_inv, Xty);

    return beta;
  }

  private transpose(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result: number[][] = [];

    for (let j = 0; j < cols; j++) {
      result[j] = [];
      for (let i = 0; i < rows; i++) {
        result[j][i] = matrix[i][j];
      }
    }

    return result;
  }

  private multiplyMatrices(matrixA: number[][], matrixB: number[][]): number[][] {
    const rowsA = matrixA.length;
    const colsA = matrixA[0].length;
    const colsB = matrixB[0].length;
    const result: number[][] = [];

    for (let i = 0; i < rowsA; i++) {
      result[i] = [];
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += matrixA[i][k] * matrixB[k][j];
        }
        result[i][j] = sum;
      }
    }

    return result;
  }

  private multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
    const result: number[] = [];

    for (let i = 0; i < matrix.length; i++) {
      let sum = 0;
      for (let j = 0; j < vector.length; j++) {
        sum += matrix[i][j] * vector[j];
      }
      result[i] = sum;
    }

    return result;
  }

  private buildAugmented(matrix: number[][]): number[][] {
    const size = matrix.length;
    return matrix.map((row, i) => {
      const identity = Array.from({ length: size }, (_, j) => (i === j ? 1 : 0));
      return [...row, ...identity];
    });
  }

  private findPivotRow(augmented: number[][], col: number, startRow: number): number {
    let maxRow = startRow;
    for (let k = startRow + 1; k < augmented.length; k++) {
      if (Math.abs(augmented[k][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = k;
      }
    }
    return maxRow;
  }

  private scalePivotRow(augmented: number[][], row: number): void {
    const pivot = augmented[row][row];
    if (Math.abs(pivot) < 1e-10) throw new Error('Matriz singular, no se puede invertir');
    const width = augmented[row].length;
    for (let j = 0; j < width; j++) augmented[row][j] /= pivot;
  }

  private eliminateOtherRows(augmented: number[][], pivotRow: number): void {
    const width = augmented[pivotRow].length;
    for (let k = 0; k < augmented.length; k++) {
      if (k === pivotRow) continue;
      const factor = augmented[k][pivotRow];
      for (let j = 0; j < width; j++) augmented[k][j] -= factor * augmented[pivotRow][j];
    }
  }

  private inverseMatrix(matrix: number[][]): number[][] {
    const size = matrix.length;
    const augmented = this.buildAugmented(matrix);

    for (let i = 0; i < size; i++) {
      const maxRow = this.findPivotRow(augmented, i, i);
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      this.scalePivotRow(augmented, i);
      this.eliminateOtherRows(augmented, i);
    }

    return augmented.map(row => row.slice(size));
  }

  private predictValue(xValue: number): number {
    let result = this.intercept;
    result += this.coefficients[0] * xValue;
    result += this.coefficients[1] * xValue * xValue;
    return result;
  }

  private predictFromX(xValues: number[]): number[] {
    return xValues.map(xi => this.predictValue(xi));
  }
}
