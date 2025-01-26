import { useState, useMemo } from 'react';
import type { MetaFunction } from '@remix-run/node';
import { BarChart } from '@mui/x-charts/BarChart';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import * as zip from '@zip.js/zip.js';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { DateTime } from 'luxon';
import {
  min,
  max,
  median,
  mean,
  average,
  quantile,
  standardDeviation,
} from 'simple-statistics';

const makeStats = (data) =>
  data.length === 0
    ? {
        min: data[0],
        max: data[0],
        median: data[0],
        mean: data[0],
        average: data[0],
        q1: data[0],
        q2: data[0],
        q3: data[0],
        sd: 0,
      }
    : {
        min: min(data),
        max: max(data),
        median: median(data),
        mean: mean(data),
        average: average(data),
        q1: quantile(data, 0.25),
        q2: quantile(data, 0.5),
        q3: quantile(data, 0.75),
        sd: standardDeviation(data),
      };

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
  day: (x) => x.calendarDate,
  week: (x) => {
    const dt = DateTime.fromString(x.calendarDate, 'yyyy-MM-dd');
    return `${dt.year}-w-${dt.weekNumber}`;
  },
  fortnight: (x) => {
    const dt = DateTime.fromString(x.calendarDate, 'yyyy-MM-dd');
    return `${dt.year}-2w-${Math.ceil(dt.weekNumber / 2)}`;
  },
  month: (x) => {
    const dt = DateTime.fromString(x.calendarDate, 'yyyy-MM-dd');
    return `${dt.year}-m-${dt.month}`;
  },
  '3months': (x) => {
    const dt = DateTime.fromString(x.calendarDate, 'yyyy-MM-dd');
    return `${dt.year}-3m-${Math.ceil(dt.month / 3)}`;
  },
  '6months': (x) => {
    const dt = DateTime.fromString(x.calendarDate, 'yyyy-MM-dd');
    return `${dt.year}-6m-${Math.ceil(dt.month / 6)}`;
  },
};

const percentPaths = [
  'deepSleepPercent',
  'lightSleepPercent',
  'remSleepPercent',
  'awakeSleepPercent',
];

const spo2Paths = ['averageSPO2', 'averageHR', 'lowestSPO2'];

const DataView = ({ data, reset }) => {
  const [period, setPeriod] = useState('month');
  const groupFn = groupers[period];
  const groupedData = useMemo(() => {
    const grouped = Object.groupBy(data, groupFn);
    return Object.keys(grouped).reduce((acc, key) => {
      const group = grouped[key];
      return {
        ...acc,
        [key]: {
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
  }, [data, groupFn]);
  return (
    <div className="flex h-screen flex-col gap-10">
      <header className="flex flex-row">
        <div className="flex-auto grid justify-items-start">
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
        </div>
        <div className="w-100 h-10 flex-initial grid justify-items-end">
          <Button variant="outlined" onClick={reset}>
            Back
          </Button>
        </div>
      </header>
      <pre>{JSON.stringify(Object.values(groupedData), null, 2)}</pre>
      <Footer />
    </div>
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
                        );

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
