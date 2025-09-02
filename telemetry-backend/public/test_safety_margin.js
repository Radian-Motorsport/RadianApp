// Test script for safety margin feature

function testSafetyMargin() {
  console.log("Testing safety margin calculations...");
  
  // Test case 1: Default 5% safety margin
  const tankCapacity = 100;
  const fuelPerLap = 2.5;
  const safetyMargin = 5;
  
  const usableFuel = tankCapacity * (1 - (safetyMargin / 100));
  const lapsPerStint = Math.floor(usableFuel / fuelPerLap);
  const reservedFuel = tankCapacity * (safetyMargin / 100);
  
  console.log(`Test case 1: Tank capacity = ${tankCapacity}L, Safety margin = ${safetyMargin}%`);
  console.log(`- Usable fuel: ${usableFuel.toFixed(1)}L`);
  console.log(`- Reserved fuel: ${reservedFuel.toFixed(1)}L`);
  console.log(`- Laps per stint: ${lapsPerStint}`);
  
  // Test case 2: Adjustable safety margin (10%)
  const customSafetyMargin = 10;
  const customUsableFuel = tankCapacity * (1 - (customSafetyMargin / 100));
  const customLapsPerStint = Math.floor(customUsableFuel / fuelPerLap);
  const customReservedFuel = tankCapacity * (customSafetyMargin / 100);
  
  console.log(`\nTest case 2: Tank capacity = ${tankCapacity}L, Safety margin = ${customSafetyMargin}%`);
  console.log(`- Usable fuel: ${customUsableFuel.toFixed(1)}L`);
  console.log(`- Reserved fuel: ${customReservedFuel.toFixed(1)}L`);
  console.log(`- Laps per stint: ${customLapsPerStint}`);
  
  // Test case 3: Zero safety margin (0%)
  const zeroSafetyMargin = 0;
  const zeroUsableFuel = tankCapacity * (1 - (zeroSafetyMargin / 100));
  const zeroLapsPerStint = Math.floor(zeroUsableFuel / fuelPerLap);
  const zeroReservedFuel = tankCapacity * (zeroSafetyMargin / 100);
  
  console.log(`\nTest case 3: Tank capacity = ${tankCapacity}L, Safety margin = ${zeroSafetyMargin}%`);
  console.log(`- Usable fuel: ${zeroUsableFuel.toFixed(1)}L`);
  console.log(`- Reserved fuel: ${zeroReservedFuel.toFixed(1)}L`);
  console.log(`- Laps per stint: ${zeroLapsPerStint}`);
  
  console.log("\nTest completed!");
}

// Run the test
testSafetyMargin();

// To run this test, open the browser console and include this script
// <script src="test_safety_margin.js"></script>
