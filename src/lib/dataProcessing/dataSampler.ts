import { PayeeRowData } from '@/lib/rowMapping/types';

export class DataSampler {
  /**
   * Smart sampling that maintains data diversity while reducing size
   */
  static smartSample(payeeRowData: PayeeRowData, targetSize: number): PayeeRowData {
    const { uniquePayeeNames, uniqueNormalizedNames, rowMappings, originalFileData } = payeeRowData;
    
    if (uniquePayeeNames.length <= targetSize) {
      return payeeRowData; // No sampling needed
    }

    console.log(`[DATA SAMPLER] Sampling ${uniquePayeeNames.length} records down to ${targetSize}`);
    
    // Use stratified sampling to maintain diversity
    const sampledIndices = this.stratifiedSample(uniquePayeeNames, targetSize);
    
    // Filter data based on sampled indices
    const sampledPayeeNames = sampledIndices.map(i => uniquePayeeNames[i]);
    const sampledNormalizedNames = sampledIndices.map(i => uniqueNormalizedNames[i]);
    
    // Filter row mappings to only include sampled payees
    const sampledRowMappings = rowMappings.filter(mapping => 
      sampledPayeeNames.includes(mapping.payeeName)
    );
    
    // Sample original file data proportionally
    const sampleRatio = targetSize / uniquePayeeNames.length;
    const sampledFileData = this.sampleOriginalData(originalFileData, sampleRatio);

    return {
      ...payeeRowData,
      uniquePayeeNames: sampledPayeeNames,
      uniqueNormalizedNames: sampledNormalizedNames,
      rowMappings: sampledRowMappings,
      originalFileData: sampledFileData,
      originalRecordCount: uniquePayeeNames.length // Track original size
    };
  }

  /**
   * Performs stratified sampling to maintain data diversity
   */
  private static stratifiedSample(payeeNames: string[], targetSize: number): number[] {
    const step = Math.floor(payeeNames.length / targetSize);
    const remainder = payeeNames.length % targetSize;
    
    const sampledIndices: number[] = [];
    
    // Take every nth item with slight randomization
    for (let i = 0; i < targetSize; i++) {
      const baseIndex = i * step;
      const randomOffset = Math.floor(Math.random() * step);
      const index = Math.min(baseIndex + randomOffset, payeeNames.length - 1);
      sampledIndices.push(index);
    }
    
    // Add some random indices from the remainder
    for (let i = 0; i < Math.min(remainder, targetSize - sampledIndices.length); i++) {
      const randomIndex = Math.floor(Math.random() * payeeNames.length);
      if (!sampledIndices.includes(randomIndex)) {
        sampledIndices.push(randomIndex);
      }
    }
    
    return sampledIndices.slice(0, targetSize);
  }

  /**
   * Samples original file data proportionally
   */
  private static sampleOriginalData(originalData: any[], sampleRatio: number): any[] {
    const targetSize = Math.ceil(originalData.length * sampleRatio);
    const step = Math.floor(originalData.length / targetSize);
    
    const sampledData: any[] = [];
    for (let i = 0; i < originalData.length && sampledData.length < targetSize; i += step) {
      sampledData.push(originalData[i]);
    }
    
    return sampledData;
  }
}