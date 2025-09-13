// utils/forecast.js
function linearForecast(data) {
  // data = [{ date: '2025-09-01', total_revenue: 100 }, ...]
  const n = data.length;
  if (n < 2) return data.map(d => ({ ...d, predicted: d.total_revenue }));

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  data.forEach((d, i) => {
    sumX += i;
    sumY += d.total_revenue;
    sumXY += i * d.total_revenue;
    sumX2 += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return data.map((d, i) => ({ ...d, predicted: intercept + slope * i }));
}

module.exports = { linearForecast };
