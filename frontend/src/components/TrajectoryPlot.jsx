import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

const SERIES_COLORS = [
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#6366f1', '#14b8a6', '#f43f5e', '#a855f7'
];

function TrajectoryPlot({ trajectory, currentTime, onSeek }) {
  const plotContainerRef = useRef(null);
  const plotInstanceRef = useRef(null);
  const cursorTimeRef = useRef(currentTime);

  useEffect(() => {
    cursorTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (!plotContainerRef.current || !trajectory || !trajectory.timestamps?.length) {
      return;
    }

    const containerWidth = plotContainerRef.current.clientWidth || 800;

    const seriesConfig = [
      { label: 'Time (s)', value: (u, v) => (v != null ? `${v.toFixed(2)}s` : '') },
      ...(trajectory.series || []).map((s, idx) => ({
        label: s.name,
        stroke: SERIES_COLORS[idx % SERIES_COLORS.length],
        width: 1.5,
        points: { show: false },
      })),
    ];

    const data = [
      trajectory.timestamps,
      ...(trajectory.series || []).map(s => s.data),
    ];

    const opts = {
      width: containerWidth,
      height: 260,
      title: 'Action & State Trajectory Timeline',
      cursor: {
        drag: { x: true, y: false },
        sync: { key: 'video_sync' },
      },
      scales: {
        x: { time: false },
        y: { auto: true },
      },
      axes: [
        {
          stroke: '#94a3b8',
          grid: { stroke: '#334155', width: 1 },
          ticks: { stroke: '#475569', width: 1 },
          values: (u, vals) => vals.map(v => `${v.toFixed(1)}s`),
        },
        {
          stroke: '#94a3b8',
          grid: { stroke: '#1e293b', width: 1 },
          ticks: { stroke: '#475569', width: 1 },
        },
      ],
      series: seriesConfig,
    };

    if (plotInstanceRef.current) {
      plotInstanceRef.current.destroy();
      plotInstanceRef.current = null;
    }

    const u = new uPlot(opts, data, plotContainerRef.current);
    plotInstanceRef.current = u;

    // Draw vertical sync scrubber bar
    u.addHook('draw', (inst) => {
      const time = cursorTimeRef.current;
      if (time === null || time === undefined) return;
      const x = inst.valToPos(time, 'x');
      if (x < 0 || x > inst.bbox.width) return;

      const ctx = inst.ctx;
      ctx.save();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, inst.bbox.top);
      ctx.lineTo(x, inst.bbox.top + inst.bbox.height);
      ctx.stroke();
      ctx.restore();
    });

    const handleClick = (e) => {
      if (!plotContainerRef.current) return;
      const rect = plotContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = u.posToVal(x, 'x');
      if (time !== undefined && onSeek) {
        onSeek(time);
      }
    };

    const containerEl = plotContainerRef.current;
    containerEl.addEventListener('click', handleClick);

    // Responsive resize handler
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = Math.floor(entry.contentRect.width);
        if (newWidth > 0 && plotInstanceRef.current) {
          plotInstanceRef.current.setSize({ width: newWidth, height: 260 });
        }
      }
    });
    resizeObserver.observe(containerEl);

    u.redraw();

    return () => {
      resizeObserver.disconnect();
      containerEl.removeEventListener('click', handleClick);
      if (plotInstanceRef.current) {
        plotInstanceRef.current.destroy();
        plotInstanceRef.current = null;
      }
    };
  }, [trajectory, onSeek]);

  // Redraw sync line whenever currentTime updates
  useEffect(() => {
    if (plotInstanceRef.current) {
      plotInstanceRef.current.redraw();
    }
  }, [currentTime]);

  return (
    <div className="trajectory-plot-wrapper">
      <div ref={plotContainerRef} className="trajectory-uplot" />
    </div>
  );
}

export default TrajectoryPlot;
