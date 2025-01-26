import { useState } from 'react';
import type { MetaFunction } from '@remix-run/node';
import { BarChart } from '@mui/x-charts/BarChart';
import { LinePlot, LineChart } from '@mui/x-charts/LineChart';
import { ResponsiveChartContainer } from '@mui/x-charts';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import * as zip from '@zip.js/zip.js';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { DateTime } from 'luxon';
import { mean, min, quantile, standardDeviation } from 'simple-statistics';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { ChartsXAxis } from '@mui/x-charts/ChartsXAxis';
import { ChartsYAxis } from '@mui/x-charts/ChartsYAxis';

// https://www.statology.org/percentile-vs-quartile-vs-quantile/
const makeStats = (data) => ({
  p0: data.length == 0 ? data[0] : quantile(data, 0),
  p1: data.length == 0 ? data[0] : quantile(data, 0.01),
  p10: data.length == 0 ? data[0] : quantile(data, 0.1),
  p25: data.length == 0 ? data[0] : quantile(data, 0.25),
  p50: data.length == 0 ? data[0] : quantile(data, 0.5),
  p75: data.length == 0 ? data[0] : quantile(data, 0.75),
  p90: data.length == 0 ? data[0] : quantile(data, 0.9),
  p99: data.length == 0 ? data[0] : quantile(data, 0.99),
  p100: data.length == 0 ? data[0] : quantile(data, 1),
  mean: data.length == 0 ? data[0] : mean(data),
  sd: data.length == 0 ? 0 : standardDeviation(data),
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export const meta: MetaFunction = () => {
  return [
    { title: 'Garmin Sleep Data Analyzer' },
    {
      name: 'description',
      content: 'See how your sleep strucutre changes over time.',
    },
  ];
};

const valueFormatter = (v) => `${v}%`;

const Footer = () => (
  <p className="text-gray-600 dark:text-gray-400">
    &copy;{new Date().getFullYear()}{' '}
    <a href="https://github.com/karlmikko" target="_blank">
      @karlmikko
    </a>
  </p>
);

const twoDecimalPlaces = (x) => new Number(x.toFixed(2));

const groupers = {
  day: (dt) => `${dt.year}-${dt.month}-${dt.day}`,
  week: (dt) => `${dt.year}-w-${dt.weekNumber}`,
  fortnight: (dt) => `${dt.year}-2w-${Math.ceil(dt.weekNumber / 2)}`,
  month: (dt) => `${dt.year}-m-${dt.month}`,
  '3months': (dt) => `${dt.year}-3m-${Math.ceil(dt.month / 3)}`,
  '6months': (dt) => `${dt.year}-6m-${Math.ceil(dt.month / 6)}`,
  year: (dt) => `${dt.year}`,
  all: () => 'all',
};

const percentPaths = [
  'totalSleepSeconds',
  'deepSleepPercent',
  'lightSleepPercent',
  'remSleepPercent',
  'awakeSleepPercent',
];

const spo2Paths = ['averageHR', 'averageSPO2', 'lowestSPO2'];

const allMetrics = [...spo2Paths, ...percentPaths.slice(1)];

const groupData = (data, groupFn) => {
  const grouped = Object.groupBy(data, (x) => groupFn(x.calendarDateTime));
  return Object.keys(grouped).reduce((acc, key) => {
    const group = grouped[key];
    return {
      ...acc,
      [key]: {
        key,
        minDateTime: DateTime.fromMillis(
          Math.min(...group.map((x) => x.calendarDateTime))
        ),
        maxDateTime: DateTime.fromMillis(
          Math.max(...group.map((x) => x.calendarDateTime))
        ),
        data: group,
        ...spo2Paths.reduce((res, pp) => {
          const converted = group
            .map((x) => x?.spo2SleepSummary?.[pp])
            .filter((x) => x >= 0);
          return {
            ...res,
            [pp]: makeStats(converted),
          };
        }, {}),
        ...percentPaths.reduce((res, pp) => {
          const converted = group.map((x) => x?.[pp]).filter((x) => x >= 0);
          return {
            ...res,
            [pp]: makeStats(converted),
          };
        }, {}),
      },
    };
  }, {});
};

const startEndDates = (data) => {
  return [data[0].calendarDateTime, data[data.length - 1].calendarDateTime];
};

const expectedDates = (start, end, groupFn, res = []) => {
  if (start > end) return res;
  const groupKey = groupFn(start);

  if (res.includes(groupKey)) {
    return expectedDates(start.plus({ days: 1 }), end, groupFn, res);
  }
  return expectedDates(start.plus({ days: 1 }), end, groupFn, [
    ...res,
    groupKey,
  ]);
};

const DataView = ({ data, reset }) => {
  const [period, setPeriod] = useState('month');
  const [initialStart, initialEnd] = startEndDates(data);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const groupFn = groupers[period];
  const groupedData = groupData(
    data.filter(
      (x) => x.calendarDateTime >= startDate && x.calendarDateTime <= endDate
    ),
    groupFn
  );
  const rangeKeys = expectedDates(startDate, endDate, groupFn);
  const seriesData = allMetrics.map((metricKey) => ({
    type: 'line',
    data: rangeKeys.map((key) => groupedData[key]?.[metricKey]?.p50),
    label: metricKey,
  }));

  console.log(seriesData);

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <div className="flex h-screen flex-col gap-10">
        <header className="flex flex-row">
          <div className="flex-auto grid justify-items-start gap-5">
            <ButtonGroup variant="outlined">
              <Button variant="text" disabled>
                Group By
              </Button>
              <>
                {[
                  ['day', 'Day'],
                  ['week', 'Week'],
                  ['fortnight', 'Fortnight'],
                  ['month', 'Month'],
                  ['3months', '3 Months'],
                  ['6months', '6 Months'],
                  ['year', 'Year'],
                  ['all', 'All'],
                ].map(([val, label]) => (
                  <Button
                    key={val}
                    onClick={() => setPeriod(val)}
                    variant={period === val ? 'contained' : undefined}
                  >
                    {label}
                  </Button>
                ))}
              </>
            </ButtonGroup>
            <div>
              <Button variant="text" disabled>
                Date Range
              </Button>
              <DatePicker
                label="Start Date"
                value={startDate}
                minDate={initialStart}
                maxDate={endDate}
                onChange={(v) => setStartDate(v)}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                minDate={startDate}
                maxDate={initialEnd}
                onChange={(v) => setEndDate(v)}
              />
              <Button
                variant="text"
                onClick={() => {
                  setStartDate(initialStart);
                  setEndDate(initialEnd);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
          <div className="w-100 h-10 flex-initial grid justify-items-end gap-5">
            <Button variant="outlined" onClick={reset}>
              Back
            </Button>
          </div>
        </header>
        <LineChart
          series={seriesData}
          xAxis={allMetrics.map((metricKey) => ({
            data: rangeKeys,
            scaleType: 'point',
            id: 'x-axis-id',
          }))}
          height={800}
        />
        <Footer />
      </div>
    </LocalizationProvider>
  );
};

export default function Index() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  if (data !== null) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <DataView
          data={data}
          reset={() => {
            setData(null);
            setError(null);
            setLoading(false);
          }}
        />
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-16">
          <header className="flex flex-col items-center gap-9">
            <h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
              Garmin Sleep Data Analyzer
            </h1>
            <div className="h-[150px] w-[434px]">
              <BarChart
                series={[
                  {
                    data: [28, 29, 27, 28],
                    stack: 'A',
                    label: 'REM',
                    valueFormatter,
                  },
                  {
                    data: [19, 18, 20, 30],
                    stack: 'A',
                    label: 'Deep',
                    valueFormatter,
                  },
                  {
                    data: [52, 51, 52, 41],
                    stack: 'A',
                    label: 'Light',
                    valueFormatter,
                  },
                  {
                    data: [1, 2, 1, 1],
                    stack: 'A',
                    label: 'Awake',
                    valueFormatter,
                  },
                ]}
                slotProps={{
                  legend: {
                    hidden: true,
                  },
                }}
                tooltip={{ trigger: 'none' }}
                height={150}
                axisHighlight={{
                  x: 'none',
                  y: 'none',
                }}
                xAxis={[
                  {
                    data: ['Feb', 'March', 'April', 'June'],
                    scaleType: 'band',
                  },
                ]}
                leftAxis={null}
                bottomAxis={null}
                margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
              />
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              To begin, select your Garmin data zip using the button below.
            </p>
            {error ? (
              <p className="text-red-600 dark:text-red-400">{error}</p>
            ) : null}
            <div className="w-[434px]">
              {loading ? (
                'Loading ...'
              ) : (
                <input
                  type="file"
                  onChange={async (e) => {
                    try {
                      if (!e.target.files?.length) return;
                      setLoading(true);
                      setError(null);
                      const entries = (
                        await Promise.all(
                          (
                            await new zip.ZipReader(
                              new zip.BlobReader(e.target.files[0])
                            ).getEntries()
                          )
                            .filter((x) =>
                              x.filename.includes('_sleepData.json')
                            )
                            .map(async (x) =>
                              JSON.parse(await x.getData(new zip.TextWriter()))
                            )
                        )
                      )
                        .flat()
                        .map((x) => {
                          const d = x?.deepSleepSeconds || 0;
                          const l = x?.lightSleepSeconds || 0;
                          const r = x?.remSleepSeconds || 0;
                          const a = x?.awakeSleepSeconds || 0;
                          const total = d + l + r + a;
                          const pF = 100 / total;
                          return {
                            ...x,
                            totalSleepSeconds: total,
                            deepSleepPercent: d * pF,
                            lightSleepPercent: l * pF,
                            remSleepPercent: r * pF,
                            awakeSleepPercent: a * pF,
                          };
                        })
                        .filter((x) => x.totalSleepSeconds > 0)
                        .filter((x) => x.unmeasurableSeconds == 0)
                        .toSorted(
                          (a, b) =>
                            new Date(a.calendarDate).getTime() -
                            new Date(b.calendarDate).getTime()
                        )
                        .map((x) => ({
                          ...x,
                          calendarDateTime: DateTime.fromString(
                            x.calendarDate,
                            'yyyy-MM-dd'
                          ),
                        }));

                      if (entries.length > 0) {
                        setData(entries);
                      } else {
                        setError('No sleep data found');
                      }
                      setLoading(false);
                    } catch (e) {
                      setError('Error loading data');
                      console.error(e);
                      setLoading(false);
                    }
                  }}
                />
              )}
            </div>
          </header>
          <p className="text-gray-600 dark:text-gray-400">
            To export all of your Garmin data, visit{' '}
            <a
              href="https://www.garmin.com/en-US/account/datamanagement/"
              target="_blank"
            >
              Data Management in your Garmin account
            </a>
            .
          </p>
          <Footer />
        </div>
      </div>
    </ThemeProvider>
  );
}
