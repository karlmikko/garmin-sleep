import { useState } from 'react';
import type { MetaFunction } from '@remix-run/node';
import { BarChart } from '@mui/x-charts/BarChart';
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

const dataView = (data, reset) => {
  return (
    <div className="flex flex-col gap-4">
      <button onClick={reset}>Back</button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default function Index() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  if (data !== null) {
    return dataView(data, () => setData(null));
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
              xAxis={[
                { data: ['Feb', 'March', 'April', 'June'], scaleType: 'band' },
              ]}
              margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
            />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            To begin, select your Garmin data zip using the button below.
          </p>
          <div className="w-[434px]">
            {loading ? (
              'Loading ...'
            ) : (
              <input
                type="file"
                onChange={async (e) => {
                  if (!e.target.files?.length) return;
                  setLoading(true);
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
                    .filter(
                      (x) =>
                        x.deepSleepSeconds > 0 ||
                        x.lightSleepSeconds > 0 ||
                        x.remSleepSeconds > 0 ||
                        x.awakeSleepSeconds > 0 ||
                        x.unmeasurableSeconds > 0
                    )
                    .toSorted(
                      (a, b) =>
                        new Date(a.calendarDate).getTime() -
                        new Date(b.calendarDate).getTime()
                    );

                  setData(entries);
                  setLoading(false);
                }}
              />
            )}
          </div>
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
          <p className="text-gray-600 dark:text-gray-400">
            &copy;{new Date().getFullYear()}{' '}
            <a href="https://github.com/karlmikko" target="_blank">
              @karlmikko
            </a>
          </p>
        </header>
      </div>
    </div>
  );
}
