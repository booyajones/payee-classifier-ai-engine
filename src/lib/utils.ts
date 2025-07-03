
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";
import { PayeeClassification, ClassificationResult } from "./types";
import * as XLSX from "xlsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUniqueId(): string {
  return uuidv4();
}

export function createPayeeClassification(
  payeeName: string,
  result: ClassificationResult
): PayeeClassification {
  return {
    id: generateUniqueId(),
    payeeName,
    result,
    timestamp: new Date(),
  };
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function downloadCSV(data: PayeeClassification[]): void {
  // Create CSV content
  const headers = ['Payee Name', 'Classification', 'Confidence', 'Processing Tier', 'Reasoning'];
  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      `"${item.payeeName.replace(/"/g, '""')}"`,
      item.result.classification,
      item.result.confidence,
      item.result.processingTier,
      `"${item.result.reasoning.replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `payee-classifications-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadJSON(data: PayeeClassification[]): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `payee-classifications-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const examplePayees = [
  "John Smith",
  "ABC Corporation",
  "Smith & Sons LLC",
  "Dr. Jane Wilson",
  "First National Bank",
  "City of Springfield",
  "Johnson Plumbing Services",
  "Acme Industries, Inc.",
  "Robert Brown CPA",
  "Northeast Medical Center",
  "Sarah Miller",
  "Miller Property Management",
  "Green Valley School District",
  "Thomas Garcia MD",
  "Garcia's Auto Repair"
];

/**
 * Parse an uploaded Excel or CSV file
 * @param file The file to parse
 * @param headersOnly If true, only returns the headers (column names)
 * @returns Array of column names if headersOnly is true, otherwise array of row objects
 */
export async function parseUploadedFile(file: File, headersOnly: boolean = false): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Failed to read file"));
          return;
        }
        
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse headers and data
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          reject(new Error("File appears to be empty"));
          return;
        }
        
        // Get headers (first row)
        const headers = jsonData[0] as string[];
        
        if (headersOnly) {
          resolve(headers);
          return;
        }
        
        // Convert data to array of objects with headers as keys
        const rows = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          const obj: Record<string, any> = {};
          
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = row[j];
          }
          
          rows.push(obj);
        }
        
        resolve(rows);
      } catch (error) {
        console.error("Error parsing file:", error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    // Read as binary string for both CSV and Excel
    reader.readAsBinaryString(file);
  });
}
