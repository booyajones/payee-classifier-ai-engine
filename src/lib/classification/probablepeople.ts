
// Use a try-catch for the import to handle potential issues
let probablepeople: any;
try {
  probablepeople = require("probablepeople");
} catch (error) {
  console.warn("Warning: probablepeople package not available, using fallback classification only");
  probablepeople = {
    parse: () => {
      throw new Error("probablepeople not available");
    }
  };
}

export { probablepeople };
