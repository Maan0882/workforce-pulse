import { getNormalizedData } from './src/utils/dataProcessing';

const data = getNormalizedData();
console.log("Employees Count:", Object.keys(data.employees).length);
console.log("Activities Count:", data.activities.length);
console.log("Logs:", data.logs);
