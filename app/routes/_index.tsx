import { useState } from 'react';
import type { MetaFunction } from '@remix-run/node';
import { BarChart } from '@mui/x-charts/BarChart';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import * as zip from '@zip.js/zip.js';

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

const DataView = ({ data, reset }) => {
  const [period, setPeriod] = useState('day');
  const startDate = new Date(data[0].calendarDate);
  const endDate = new Date(data[data.length - 1].calendarDate);
  return (
    <div className="flex h-screen flex-col gap-10">
      <header className="flex flex-row">
        <div className="flex-auto grid justify-items-start">
          <ButtonGroup variant="outlined">
            {[
              ['day', 'Day'],
              ['week', 'Week'],
              ['fortnight', 'Fortnight'],
              ['month', 'Month'],
              ['3months', '3 Months'],
              ['6months', '6 Months'],
            ].map(([val, label]) => (
              <Button
                onClick={() => setPeriod(val)}
                variant={period === val ? 'contained' : undefined}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
        <div className="w-100 h-10 flex-initial grid justify-items-end">
          <Button variant="outlined" onClick={reset}>
            Back
          </Button>
        </div>
      </header>
      <pre>{JSON.stringify(data, null, 2)}</pre>
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
      <DataView
        data={data}
        reset={() => {
          setData(null);
          setError(null);
          setLoading(false);
        }}
      />
    );
  }
  return (
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
                { data: ['Feb', 'March', 'April', 'June'], scaleType: 'band' },
              ]}
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
                          .filter((x) => x.filename.includes('_sleepData.json'))
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
                        const percentFactor = 100 / total;
                        const makePercent = (v) =>
                          (v * percentFactor).toFixed(2);
                        return {
                          ...x,
                          totalSleepSeconds: total,
                          deepSleepPercent: makePercent(d),
                          lightSleepPercent: makePercent(l),
                          remSleepPercent: makePercent(r),
                          awakeSleepPercent: makePercent(a),
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
  );
}
