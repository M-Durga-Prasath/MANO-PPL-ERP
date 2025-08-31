import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";

const API_URI = import.meta.env.VITE_API_URI;
const PORT = import.meta.env.VITE_BACKEND_PORT;

function DprUpdateSubmit() {
  const { projectId, dprId } = useParams();
  const navigate = useNavigate();

  // ---------- Read-only project data ----------
  const [project, setProject] = useState(null);

  // ---------- Editable DPR form state ----------
  const [reportDate, setReportDate] = useState(""); // read-only later
  const [siteCondition, setSiteCondition] = useState({
    is_rainy: false,
    ground_state: "",
    rain_timing: [],
  });

  const [labourReport, setLabourReport] = useState({
    agency: [],
    remarks: [],
  });
  const labourCols = useMemo(() => {
    return Object.keys(labourReport).filter(
      (k) => k !== "agency" && k !== "remarks"
    );
  }, [labourReport]);

  // Today / Tomorrow
  const [todayProg, setTodayProg] = useState({ progress: [], qty: [] });
  const [tomorrowPlan, setTomorrowPlan] = useState({ plan: [], qty: [] });

  // Events & Footer
  const [eventsRemarks, setEventsRemarks] = useState([]);
  const [bottomRemarks, setBottomRemarks] = useState([]);
  const [preparedBy, setPreparedBy] = useState("");
  const [distribute, setDistribute] = useState([]);

  // UI helpers
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Utils
  const isoToYMD = (iso) => (typeof iso === "string" ? iso.split("T")[0] : "");
  const ymdToDMY = (ymd) => {
    if (!ymd) return "";
    const [y, m, d] = ymd.split("-");
    return `${d}/${m}/${y}`;
  };
  const formatISOToDMY = (iso) => {
    if (!iso) return "";
    const ymd = isoToYMD(iso);
    return ymdToDMY(ymd);
  };

  const elapsedRemaining = useMemo(() => {
    if (!project?.start_date || !project?.end_date)
      return { elapsed: "--", left: "--" };
    const s = new Date(project.start_date);
    const e = new Date(project.end_date);
    const current = reportDate
      ? new Date(
          Date.UTC(
            Number(reportDate.slice(0, 4)),
            Number(reportDate.slice(5, 7)) - 1,
            Number(reportDate.slice(8, 10))
          )
        )
      : new Date();

    const DAY = 86400000;
    const startUTC = new Date(
      Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate())
    );
    const endUTC = new Date(
      Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate())
    );

    const totalDays = Math.max(0, Math.floor((endUTC - startUTC) / DAY));
    let elapsed = Math.floor((current - startUTC) / DAY);
    if (elapsed < 0) elapsed = 0;
    if (elapsed > totalDays) elapsed = totalDays;
    const left = totalDays - elapsed;

    return { elapsed, left };
  }, [project, reportDate]);

  // Fetch data
  useEffect(() => {
    let mounted = true;

    async function fetchProject() {
      const res = await fetch(
        `http://${API_URI}:${PORT}/project/getProject/${projectId}`,
        { credentials: "include" }
      );
      const { data } = await res.json();
      if (!mounted) return;
      setProject(data || null);
    }

    async function fetchDpr() {
      const res = await fetch(
        `http://${API_URI}:${PORT}/report/getDPR/${dprId}`,
        { credentials: "include" }
      );
      const { data } = await res.json();
      if (!mounted) return;

      setReportDate(data?.report_date ? isoToYMD(data.report_date) : "");
      setSiteCondition({
        is_rainy: !!data?.site_condition?.is_rainy,
        ground_state: data?.site_condition?.ground_state || "",
        rain_timing: Array.isArray(data?.site_condition?.rain_timing)
          ? data.site_condition.rain_timing
          : [],
      });

      const lr = data?.labour_report || {};
      const safe = {
        agency: Array.isArray(lr.agency) ? lr.agency : [],
        remarks: Array.isArray(lr.remarks) ? lr.remarks : [],
      };
      Object.keys(lr || {}).forEach((k) => {
        if (k !== "agency" && k !== "remarks") {
          safe[k] = Array.isArray(lr[k]) ? lr[k] : [];
        }
      });
      setLabourReport(safe);

      setTodayProg({
        progress: Array.isArray(data?.today_prog?.progress)
          ? data.today_prog.progress
          : [],
        qty: Array.isArray(data?.today_prog?.qty) ? data.today_prog.qty : [],
      });
      setTomorrowPlan({
        plan: Array.isArray(data?.tomorrow_plan?.plan)
          ? data.tomorrow_plan.plan
          : [],
        qty: Array.isArray(data?.tomorrow_plan?.qty)
          ? data.tomorrow_plan.qty
          : [],
      });

      setEventsRemarks(
        Array.isArray(data?.events_remarks) ? data.events_remarks : []
      );
      setBottomRemarks(
        Array.isArray(data?.report_footer?.bottom_remarks)
          ? data.report_footer.bottom_remarks
          : []
      );
      setPreparedBy(data?.report_footer?.prepared_by || "");
      setDistribute(
        Array.isArray(data?.report_footer?.distribute)
          ? data.report_footer.distribute
          : []
      );
    }

    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchProject(), fetchDpr()]);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [projectId, dprId]);

  // ---- Labour handlers (only numbers & remarks editable) ----
  const setRemark = (idx, val) =>
    setLabourReport((p) => {
      const next = { ...p, remarks: [...p.remarks] };
      next.remarks[idx] = val;
      return next;
    });
  const setCell = (col, idx, val) =>
    setLabourReport((p) => {
      const next = { ...p, [col]: [...(p[col] || [])] };
      const n = Number(val);
      next[col][idx] = Number.isFinite(n) && n >= 0 ? n : 0;
      return next;
    });

  const rowTotal = (idx) =>
    labourCols.reduce(
      (sum, c) => sum + (Number(labourReport[c]?.[idx]) || 0),
      0
    );

  const colTotals = useMemo(() => {
    const totals = {};
    labourCols.forEach((c) => {
      totals[c] = (labourReport[c] || []).reduce(
        (s, v) => s + (Number(v) || 0),
        0
      );
    });
    totals.total = Object.values(totals).reduce((s, v) => s + (v || 0), 0);
    return totals;
  }, [labourCols, labourReport]);

  // Save
  const onSave = async () => {
    try {
      setSaving(true);
      const payload = {
        report_date: reportDate || null,
        site_condition: siteCondition,
        labour_report: labourReport,
        today_prog: todayProg,
        tomorrow_plan: tomorrowPlan,
        events_remarks: eventsRemarks,
        report_footer: {
          prepared_by: preparedBy,
          distribute,
          bottom_remarks: bottomRemarks,
        },
      };
      const res = await fetch(
        `http://${API_URI}:${PORT}/report/updateDPR/${dprId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (res.ok && (data.ok || data.success)) {
        toast.success("DPR updated successfully");
      } else {
        toast.error(data.message || "Failed to update DPR");

      }
    } catch (e) {
      console.error(e);
      toast.error("Error updating DPR");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  function EditableTable({
    title,
    rows,
    leftPlaceholder,
    rightPlaceholder,
    onAdd,
    onRemove,
    onChangeLeft,
    onChangeRight,
  }) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onAdd}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            + Add Row
          </button>
        </div>
        <table className="w-full text-sm border-separate border-spacing-y-2">
          <thead className="text-gray-300 border-b border-gray-600">
            <tr>
              <th className="py-2 pl-2 text-left">{leftPlaceholder}</th>
              <th className="text-right pr-2">{rightPlaceholder}</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="text-white">
            {rows.length ? (
              rows.map((r, i) => (
                <tr key={i}>
                  <td className="pl-2 py-2">
                    <input
                      type="text"
                      value={r.left}
                      onChange={(e) => onChangeLeft(i, e.target.value)}
                      className="w-full bg-transparent border-b border-gray-600 outline-none"
                      placeholder={leftPlaceholder}
                    />
                  </td>
                  <td className="pr-2 py-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={r.right ?? ""}
                      onChange={(e) => onChangeRight(i, e.target.value)}
                      className="w-full bg-transparent border-b border-gray-600 outline-none text-right"
                      placeholder={rightPlaceholder}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      className="text-red-400 hover:text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="text-gray-500 italic py-4" colSpan={3}>
                  No rows yet. Use “+ Add Row”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function EditableList({
    title,
    items,
    onAdd,
    onRemove,
    onChange,
    placeholder,
    className = "",
    children,
  }) {
    return (
      <div
        className={`bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg ${className}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onAdd}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            + Add
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {items.length ? (
            items.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={t}
                  onChange={(e) => onChange(i, e.target.value)}
                  className="flex-1 bg-transparent border-b border-gray-600 outline-none"
                  placeholder={placeholder}
                />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="text-red-400 hover:text-red-500 text-sm"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="text-gray-500 italic">No items yet.</div>
          )}
        </div>
        {children}
      </div>
    );
  }

  // ---- Today handlers ----
  const addTodayRow = () =>
    setTodayProg((p) => ({
      progress: [...p.progress, ""],
      qty: [...p.qty, ""],
    }));

  const removeTodayRow = (i) =>
    setTodayProg((p) => ({
      progress: p.progress.filter((_, idx) => idx !== i),
      qty: p.qty.filter((_, idx) => idx !== i),
    }));

  const setTodayProgress = (i, val) =>
    setTodayProg((p) => {
      const next = [...p.progress];
      next[i] = val;
      return { ...p, progress: next };
    });

  const setTodayQty = (i, val) =>
    setTodayProg((p) => {
      const next = [...p.qty];
      next[i] = val;
      return { ...p, qty: next };
    });

  // ---- Tomorrow handlers ----
  const addTomorrowRow = () =>
    setTomorrowPlan((p) => ({ plan: [...p.plan, ""], qty: [...p.qty, ""] }));

  const removeTomorrowRow = (i) =>
    setTomorrowPlan((p) => ({
      plan: p.plan.filter((_, idx) => idx !== i),
      qty: p.qty.filter((_, idx) => idx !== i),
    }));

  const setTomorrowPlanText = (i, val) =>
    setTomorrowPlan((p) => {
      const next = [...p.plan];
      next[i] = val;
      return { ...p, plan: next };
    });

  const setTomorrowQty = (i, val) =>
    setTomorrowPlan((p) => {
      const next = [...p.qty];
      next[i] = val;
      return { ...p, qty: next };
    });

  // ---- Events & Remarks handlers ----
  const addEvent = () => setEventsRemarks((p) => [...p, ""]);
  const removeEvent = (i) =>
    setEventsRemarks((p) => p.filter((_, idx) => idx !== i));
  const setEvent = (i, val) =>
    setEventsRemarks((p) => {
      const next = [...p];
      next[i] = val;
      return next;
    });

  const addBottomRemark = () => setBottomRemarks((p) => [...p, ""]);
  const removeBottomRemark = (i) =>
    setBottomRemarks((p) => p.filter((_, idx) => idx !== i));
  const setBottomRemark = (i, val) =>
    setBottomRemarks((p) => {
      const next = [...p];
      next[i] = val;
      return next;
    });

  // ---- Distribute handlers ----
  const addDistributor = () => setDistribute((p) => [...p, ""]);
  const removeDistributor = (i) =>
    setDistribute((p) => p.filter((_, idx) => idx !== i));
  const setDistributor = (i, val) =>
    setDistribute((p) => {
      const next = [...p];
      next[i] = val;
      return next;
    });

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 px-6 py-8 md:px-12 lg:px-20">
      {/* Toast */}
      <ToastContainer position="top-right" autoClose={2500} />

      {/* Page Header */}
      {/* Header with Title + Report Date */}
      <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-8">
        <h1 className="text-3xl font-bold">Daily Progress Report — Update</h1>
        <div className="bg-gray-800 px-4 py-2 rounded-lg text-sm text-gray-300 shadow">
          Report Date:{" "}
          <span className="font-semibold text-white">
            {reportDate ? ymdToDMY(reportDate) : "—"}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {/* Project Info + Timeline */}
        <div className="bg-gray-800 rounded-xl p-6 space-y-4 col-span-2 shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">
            Project Information
          </h2>

          {/* Project details grid */}
          <div className="grid grid-cols-2 gap-2 text-base">
            <p>
              <span className="text-gray-400">Name of Work:</span>{" "}
              <strong>{project?.project_name || "—"}</strong>
            </p>
            <p>
              <span className="text-gray-400">Employer:</span>{" "}
              <strong>{project?.Employer || "—"}</strong>
            </p>
            <p>
              <span className="text-gray-400">Project Code:</span>{" "}
              <strong>{project?.project_code || "—"}</strong>
            </p>
            <p>
              <span className="text-gray-400">Location:</span>{" "}
              <strong>{project?.location || "—"}</strong>
            </p>
          </div>

          {/* Elapsed / Remaining Days Row */}
          <div className="flex justify-between mt-6 text-sm">
            {/* Elapsed Days */}
            <div className="relative left-6">
              <div className="text-gray-400 relative left-12 mb-1">
                Elapsed Days
              </div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <span className="material-icons bg-white rounded-full text-black text-3xl flex items-center justify-center w-10 h-10">
                  calendar_today
                </span>
                <span>{elapsedRemaining?.elapsed || 0}</span>
                <span className="text-xl font-normal">days</span>
              </div>
              <div className="text-gray-400 relative left-12 mt-1">
                Start: {formatISOToDMY(project?.start_date) || "—"}
              </div>
            </div>

            {/* Remaining Days */}
            <div className="relative right-80">
              <div className="text-gray-400 relative left-12 mb-1">
                Remaining Days
              </div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <span className="material-icons bg-white rounded-full text-black text-3xl flex items-center justify-center w-10 h-10">
                  calendar_today
                </span>
                <span>{elapsedRemaining?.left || 0}</span>
                <span className="text-xl font-normal">days</span>
              </div>
              <div className="text-gray-400 relative left-12 mt-1">
                End: {formatISOToDMY(project?.end_date) || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Site Conditions (moved to right side) */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">
            Site Conditions
          </h2>

          <div className="flex gap-4 items-center mb-4">
            <label>
              <input
                type="checkbox"
                checked={siteCondition.is_rainy}
                onChange={(e) =>
                  setSiteCondition((s) => ({
                    ...s,
                    is_rainy: e.target.checked,
                  }))
                }
              />{" "}
              Rainy
            </label>
            <label>
              <input
                type="radio"
                checked={siteCondition.ground_state === "slushy"}
                onChange={() =>
                  setSiteCondition((s) => ({ ...s, ground_state: "slushy" }))
                }
              />{" "}
              Slushy
            </label>
            <label>
              <input
                type="radio"
                checked={siteCondition.ground_state === "dry"}
                onChange={() =>
                  setSiteCondition((s) => ({ ...s, ground_state: "dry" }))
                }
              />{" "}
              Dry
            </label>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span>Rain Timings</span>
              <button
                disabled={(siteCondition.rain_timing || []).length >= 3}
                onClick={() =>
                  setSiteCondition((s) => ({
                    ...s,
                    rain_timing: [...(s.rain_timing || []), "00:00-01:00"],
                  }))
                }
                className="bg-gray-700 px-2 py-1 rounded disabled:opacity-50"
              >
                + Add
              </button>
            </div>

            {(siteCondition.rain_timing || []).map((slot, i) => {
              const [from, to] = (slot || "").split("-");
              return (
                <div key={i} className="flex gap-2 items-center mb-1">
                  <input
                    type="time"
                    style={{ colorScheme: "dark" }}
                    value={from}
                    onChange={(e) => {
                      const next = [...siteCondition.rain_timing];
                      next[i] = `${e.target.value}-${to}`;
                      setSiteCondition((s) => ({ ...s, rain_timing: next }));
                    }}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    style={{ colorScheme: "dark" }}
                    value={to}
                    onChange={(e) => {
                      const next = [...siteCondition.rain_timing];
                      next[i] = `${from}-${e.target.value}`;
                      setSiteCondition((s) => ({ ...s, rain_timing: next }));
                    }}
                  />
                  <button
                    onClick={() =>
                      setSiteCondition((s) => ({
                        ...s,
                        rain_timing: s.rain_timing.filter(
                          (_, idx) => idx !== i
                        ),
                      }))
                    }
                    className="text-red-400"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Labour Report */}
      <div className="bg-gray-800/60 p-6 rounded-xl mb-10 shadow-lg border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4 text-blue-400">
          Labour Report
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-700/60 text-gray-300 uppercase text-xs tracking-wider">
                <th className="px-3 py-2 text-left">Agency</th>
                {labourCols.map((c) => (
                  <th key={c} className="px-3 py-2 text-center">
                    {c}
                  </th>
                ))}
                <th className="px-3 py-2 text-center">Total</th>
                <th className="px-3 py-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {labourReport.agency.map((a, i) => (
                <tr
                  key={`${a}-${i}`}
                  className="even:bg-gray-700/40 hover:bg-gray-700/60 transition"
                >
                  <td className="px-3 py-2 font-medium">{a}</td>
                  {labourCols.map((c) => (
                    <td key={c} className="px-3 py-2 text-center">
                      <input
                        type="text"
                        inputMode="number"
                        pattern="[0-9]*"
                        value={labourReport[c]?.[i] ?? ""}
                        onChange={(e) => setCell(c, i, e.target.value)}
                        className="w-20 text-right bg-gray-900/50 border border-gray-600 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold">
                    {rowTotal(i)}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={labourReport.remarks?.[i] || ""}
                      onChange={(e) => setRemark(i, e.target.value)}
                      className="w-full bg-gray-900/50 border border-gray-600 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-900/70 font-semibold">
                <td className="px-3 py-2">Total</td>
                {labourCols.map((c) => (
                  <td key={c} className="px-3 py-2 text-center">
                    {colTotals[c] || 0}
                  </td>
                ))}
                <td className="px-3 py-2 text-center text-blue-400 font-bold">
                  {colTotals.total || 0}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Today / Tomorrow */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <EditableTable
          title="Today's Progress"
          rows={todayProg.progress.map((t, i) => ({
            left: t,
            right: todayProg.qty[i],
          }))}
          leftPlaceholder="Task"
          rightPlaceholder="Quantity"
          onAdd={() => addTodayRow()}
          onRemove={(i) => removeTodayRow(i)}
          onChangeLeft={(i, v) => setTodayProgress(i, v)}
          onChangeRight={(i, v) => setTodayQty(i, v)}
        />
        <EditableTable
          title="Tomorrow's Planning"
          rows={tomorrowPlan.plan.map((t, i) => ({
            left: t,
            right: tomorrowPlan.qty[i],
          }))}
          leftPlaceholder="Task"
          rightPlaceholder="Quantity"
          onAdd={() => addTomorrowRow()}
          onRemove={(i) => removeTomorrowRow(i)}
          onChangeLeft={(i, v) => setTomorrowPlanText(i, v)}
          onChangeRight={(i, v) => setTomorrowQty(i, v)}
        />
      </div>

      {/* Events & Remarks */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <EditableList
          className="md:col-span-2"
          title="Events & Remarks"
          items={eventsRemarks}
          onAdd={addEvent}
          onRemove={removeEvent}
          onChange={setEvent}
          placeholder="Enter event or remark"
        />
        <EditableList
          title="General Remarks"
          items={bottomRemarks}
          onAdd={addBottomRemark}
          onRemove={removeBottomRemark}
          onChange={setBottomRemark}
          placeholder="Enter general remark"
        >
          <div className="mt-4 border-t border-gray-700 pt-4 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Prepared By
              </label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="w-full bg-transparent border-b border-gray-600 outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-300">
                  Distribute
                </label>
                <button
                  type="button"
                  onClick={addDistributor}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {distribute.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={d}
                      onChange={(e) => setDistributor(i, e.target.value)}
                      className="flex-1 bg-transparent border-b border-gray-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeDistributor(i)}
                      className="text-red-400 hover:text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {!distribute.length && (
                  <div className="text-gray-500 text-sm">
                    No recipients yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </EditableList>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-5 py-2 rounded bg-gray-700 hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={`px-5 py-2 rounded font-semibold ${
            saving
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default DprUpdateSubmit;
