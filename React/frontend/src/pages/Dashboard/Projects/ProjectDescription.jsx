import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Calendar from "../../SmolComponents/calendar";

function ProjectDescription() {
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [dprs, setDprs] = useState([]);

  const API_URI = import.meta.env.VITE_API_URI;
  const PORT = import.meta.env.VITE_BACKEND_PORT;
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("projectId");

  useEffect(() => {
    if (!projectId) return;

    fetch(`http://${API_URI}:${PORT}/project/getProject/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProject(data.data);
      })
      .catch((err) => console.error("Failed to load project:", err));

    fetch(`http://${API_URI}:${PORT}/report/Alldpr/${projectId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((dprs2) => {
        if (!Array.isArray(dprs2)) {
          console.error("Unexpected DPRs response:", dprs2);
          return;
        }

        dprs2.sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
        setDprs(dprs2);
      })
      .catch((err) => console.error("Failed to load DPRs:", err));
  }, [projectId]);

  // Calculate project progress percentage
  const getProgressPercentage = () => {
    if (!project?.start_date || !project?.end_date) return "0%";
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const today = new Date();

    if (today < start) return "0%";
    if (today > end) return "100%";

    const total = end - start;
    const elapsed = today - start;
    const percent = Math.floor((elapsed / total) * 100);
    return `${percent}%`;
  };

  return (
    <main className="flex-1 p-8 bg-gray-900">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[var(--text-primary)]">
            {project?.project_name || "Project"}
          </h1>
          <p className="text-[var(--text-secondary)]">
            Welcome back, let's get to work!
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
            onClick={() => navigate("/dashboard/home")}
          >
            <span className="material-icons">home</span>
            <span>Home</span>
          </button>
          <div className="relative">
            <img
              alt="user avatar"
              className="w-12 h-12 rounded-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzZrALTDtNtoKllECNeqa-KoCN3A3yAA9_l9U090P2qBGmuGd2sTXowj5ERtTyWBKsabMMLDKN2yvh5fs5vmv9BGyibq6-CvXy_dBvBywiGsXeBSbdxaYz9c3P82YPwtCzPLDyJYxTwcljuLX_aJu5tsw9ix3-A85mYi0S35mJNShmb5HaBZFguOZLtWfn1xI5a_nwj5FlApnATfVTO9AvOfVoxD0mqrb6hvV3oad2HofH0PbXsM_JRpiUn9T36C-TkH1_JAvLpCI"
            />
            <span className="absolute right-0 bottom-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-transform duration-300 p-6">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gray-900 mb-4 flex items-center justify-center border-4 border-[var(--accent-blue)]">
                <span className="material-icons text-5xl text-[var(--accent-blue)]">
                  flight
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {project?.project_name || "Project"}
              </h2>
            </div>
            <div className="mt-6 space-y-2 text-[var(--text-secondary)]">
              <p>
                <strong className="text-[var(--text-primary)]">Project:</strong>{" "}
                {project?.project_name || "-"}
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">
                  Employer:
                </strong>{" "}
                {project?.Employer || "-"}
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">
                  Location:
                </strong>{" "}
                {project?.location || "-"}
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">
                  Project Code:
                </strong>{" "}
                {project?.contract_no || "-"}
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">
                  Project Description:
                </strong>{" "}
                {project?.project_description || "-"}
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Start:</strong>{" "}
                {project?.start_date
                  ? new Date(project.start_date).toLocaleDateString("en-GB")
                  : "-"}
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">End:</strong>{" "}
                {project?.end_date
                  ? new Date(project.end_date).toLocaleDateString("en-GB")
                  : "-"}
              </p>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-transform duration-300 p-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              Project Progress
            </h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-[var(--accent-blue)] bg-gray-900">
                  Task in progress
                </span>
                <span className="text-xs font-semibold text-[var(--accent-blue)]">
                  {getProgressPercentage()}
                </span>
              </div>
              <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-[var(--border-color)]">
                <div
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[var(--accent-blue)]"
                  style={{ width: getProgressPercentage() }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-transform duration-300 p-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                Manpower
              </h3>
              <p className="text-[var(--text-secondary)] mb-4">
                Current on-site personnel.
              </p>
              <div className="flex items-center space-x-4">
                <span className="material-icons text-5xl text-[var(--accent-blue)]">
                  groups
                </span>
                <div className="text-5xl font-bold text-[var(--text-primary)]">
                  1,250
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-transform duration-300 p-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                Equipment
              </h3>
              <p className="text-[var(--text-secondary)] mb-4">
                Active machinery and tools.
              </p>
              <div className="flex items-center space-x-4">
                <span className="material-icons text-5xl text-[var(--accent-blue)]">
                  construction
                </span>
                <div className="text-5xl font-bold text-[var(--text-primary)]">
                  350
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-transform duration-300 p-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
               Daily Progress Report Summary
            </h3>
            <div className="w-full h-64 bg-gray-900 rounded-lg flex items-stretch justify-stretch border border-gray-700 p-0">
              <div className="w-full h-full">
                <Calendar dprDates={dprs.map(d => d.report_date)} />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-transform duration-300 p-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              Daily Progress Reports
            </h3>
            {dprs.length === 0 ? (
              <p className="text-[var(--text-secondary)]">
                No DPR Data to fetch.
              </p>
            ) : (
              <ul className="space-y-4">
                {dprs.map((dpr) => {
                  const date = new Date(dpr.report_date);
                  const dateStr = date.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  });
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  date.setHours(0, 0, 0, 0);
                  const diffDays = Math.floor(
                    (today - date) / (1000 * 60 * 60 * 24)
                  );
                  const label =
                    diffDays === 0
                      ? "Today"
                      : diffDays === 1
                      ? "Yesterday"
                      : `${diffDays} days ago`;
                  return (
                    <li
                      key={dpr.dpr_id}
                      id={dpr.dpr_id}
                      className="flex justify-between items-center p-4 bg-gray-900 rounded-lg border border-gray-700 hover:border-[var(--accent-blue)] transition-all cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/dashboard/project-description/dpr-fetch?projectId=${projectId}&dprId=${dpr.dpr_id}`
                        )
                      }
                    >
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          DPR - {dateStr}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Submitted by {dpr.username}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
                        <span className="material-icons text-base">today</span>
                        <span>{label}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default ProjectDescription;
