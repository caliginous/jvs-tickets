import { createReadStream } from "node:fs";
import { parse } from "csv-parse";

async function debugCSV() {
  const rows = await new Promise<any[]>((resolve, reject) => {
    const items: any[] = [];
    createReadStream("imports/order_export_2025-08-23-01-09-23.csv")
      .pipe(parse({ 
        columns: true, 
        relax_column_count: true, 
        skip_empty_lines: true,
        trim: true
      }))
      .on("data", (r) => items.push(r))
      .on("end", () => resolve(items))
      .on("error", reject);
  });

  console.log("Total rows:", rows.length);
  
  if (rows.length > 0) {
    const firstRow = rows[0];
    console.log("\nFirst row keys:");
    Object.keys(firstRow).forEach((key, index) => {
      console.log(`${index}: "${key}"`);
    });
    
    console.log("\nFirst row data:");
    console.log("order_id:", firstRow["order_id"]);
    console.log("Product Item 1 Name:", firstRow["Product Item 1 Name"]);
    console.log('"Product Item 1 Name":', firstRow['"Product Item 1 Name"']);
    
    // Try to find the product name column
    const productNameKeys = Object.keys(firstRow).filter(key => key.includes("Product Item 1 Name"));
    console.log("\nKeys containing 'Product Item 1 Name':", productNameKeys);
    
    if (productNameKeys.length > 0) {
      console.log("Value from first matching key:", firstRow[productNameKeys[0]]);
    }
  }
}

debugCSV().catch(console.error);
