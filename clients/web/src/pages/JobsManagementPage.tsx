import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import api from "@/services/api";
import { EmploymentType, JobFeedItem, JobStatus, WorkMode } from "@/types";
import { toast } from "@/components/ui/sonner";
import {
  BriefcaseBusiness,
  Flag,
  PlusCircle,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ApiError {
  response?: { data?: { message?: string } };
  message?: string;
}

type RoleView = "ALUMNI" | "ADMIN";
type JobStatusFilter = JobStatus | "ALL";

interface CreateJobForm {
  title: string;
  companyName: string;
  description: string;
  location: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  department: string;
  tags: string;
  salaryRange: string;
  deadline: string;
}

const DEFAULT_FORM: CreateJobForm = {
  title: "",
  companyName: "",
  description: "",
  location: "",
  employmentType: "FULL_TIME",
  workMode: "ON_SITE",
  department: "",
  tags: "",
  salaryRange: "",
  deadline: "",
};

const statusStyles: Record<JobStatusFilter, string> = {
  ALL: "bg-secondary text-secondary-foreground",
  DRAFT: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-rose-100 text-rose-700",
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const e = error as ApiError;
  return e?.response?.data?.message || e?.message || fallback;
};

const readResponseList = (payload: unknown): JobFeedItem[] => {
  if (Array.isArray(payload)) return payload as JobFeedItem[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const maybeData = (payload as { data?: unknown }).data;
    if (Array.isArray(maybeData)) return maybeData as JobFeedItem[];
  }
  return [];
};

const JobsManagementPage = () => {
  const { user } = useAuth();

  const roleView = useMemo<RoleView | null>(() => {
    if (user?.role === "ALUMNI") return "ALUMNI";
    if (user?.role === "ADMIN") return "ADMIN";
    return null;
  }, [user?.role]);

  const limit = Number(import.meta.env.VITE_FEED_LIMIT);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>("ALL");
  const [jobs, setJobs] = useState<JobFeedItem[]>([]);
  const [reportedJobs, setReportedJobs] = useState<JobFeedItem[]>([]);
  const [reportedUnavailable, setReportedUnavailable] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isLoadingReported, setIsLoadingReported] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateJobForm>(DEFAULT_FORM);

  const fetchManagedJobs = useCallback(async () => {
    if (!roleView) return;

    setIsLoadingJobs(true);
    try {
      const endpoint =
        roleView === "ADMIN" ? "career/jobs/admin" : "career/jobs/my-created";

      const params: Record<string, string | number | undefined> = {
        limit,
        search: search || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      };

      const response = await api.get(endpoint, { params });
      setJobs(readResponseList(response.data));
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load jobs"));
    } finally {
      setIsLoadingJobs(false);
    }
  }, [limit, roleView, search, statusFilter]);

  const fetchReportedJobs = useCallback(async () => {
    if (roleView !== "ADMIN") return;

    setIsLoadingReported(true);
    try {
      const response = await api.get("career/jobs/reported", {
        params: { limit, status: "PUBLISHED" },
      });
      setReportedJobs(readResponseList(response.data));
      setReportedUnavailable(false);
    } catch {
      // Backend endpoint is not available yet. Keep page usable with a clear state.
      setReportedJobs([]);
      setReportedUnavailable(true);
    } finally {
      setIsLoadingReported(false);
    }
  }, [limit, roleView]);

  useEffect(() => {
    fetchManagedJobs();
  }, [fetchManagedJobs]);

  useEffect(() => {
    if (roleView === "ADMIN") {
      fetchReportedJobs();
    }
  }, [fetchReportedJobs, roleView]);

  const handleCreateJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const tags = form.tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setIsSubmittingCreate(true);
    try {
      await api.post("career/jobs", {
        title: form.title,
        companyName: form.companyName,
        description: form.description,
        location: form.location,
        employmentType: form.employmentType,
        workMode: form.workMode,
        department: form.department,
        tags,
        salaryRange: form.salaryRange || undefined,
        deadline: new Date(form.deadline).toISOString(),
      });

      toast.success("Job created as draft");
      setForm(DEFAULT_FORM);
      setIsCreateDialogOpen(false);
      fetchManagedJobs();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create job"));
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handlePublishJob = async (jobId: string) => {
    try {
      await api.patch(`career/jobs/${jobId}/publish`);
      toast.success("Job published");
      fetchManagedJobs();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to publish job"));
    }
  };

  const handleCloseByOwner = async (jobId: string) => {
    if (!window.confirm("Close this job posting?")) return;

    try {
      await api.delete(`career/jobs/${jobId}`);
      toast.success("Job closed");
      fetchManagedJobs();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to close job"));
    }
  };

  const handleDeleteByAdmin = async (jobId: string) => {
    if (!window.confirm("Delete this job as admin?")) return;

    try {
      await api.delete(`career/jobs/admin/${jobId}`);
      toast.success("Job deleted by admin");
      fetchManagedJobs();
      fetchReportedJobs();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete job"));
    }
  };

  const updateForm = <K extends keyof CreateJobForm>(
    key: K,
    value: CreateJobForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (!roleView) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-12 w-12" />}
        title="Access restricted"
        description="Only alumni and admins can access job management."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Jobs Management
          </h1>
          <p className="text-muted-foreground">
            {roleView === "ALUMNI"
              ? "Create and manage your own job postings"
              : "Review all jobs, monitor reports, and take moderation actions"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            fetchManagedJobs();
            if (roleView === "ADMIN") fetchReportedJobs();
          }}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          <RefreshCcw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Reported Jobs Section */}
      {roleView === "ADMIN" && (
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-card-foreground">
              Reported Jobs
            </h2>
          </div>

          {isLoadingReported ? (
            <p className="text-sm text-muted-foreground">
              Loading reported jobs...
            </p>
          ) : reportedUnavailable ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Reported-jobs API is not available yet. This panel is ready and
              will start showing data once the backend endpoint is added.
            </div>
          ) : reportedJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reported jobs right now.
            </p>
          ) : (
            <div className="space-y-2">
              {reportedJobs.map((job) => (
                <div key={job._id} className="rounded-lg border p-3">
                  <p className="font-medium text-sm text-card-foreground">
                    {job.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {job.companyName}
                  </p>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteByAdmin(job._id)}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Delete as Admin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Search and Filter Section */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search
            </label>
            <input
              className="h-10 w-full rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by title, company, location"
            />
          </div>

          <button
            type="button"
            onClick={() => setSearch(searchInput.trim())}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Search
          </button>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as JobStatusFilter)
              }
              className="h-10 min-w-44 rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {roleView === "ALUMNI" && (
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="h-10 inline-flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <PlusCircle className="h-4 w-4" /> Create Job
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Create Job</DialogTitle>
                  <DialogDescription>
                    New jobs are created as drafts. Publish when ready.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={handleCreateJob}
                >
                  <input
                    required
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    placeholder="Job title"
                    className="h-10 rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    required
                    value={form.companyName}
                    onChange={(event) =>
                      updateForm("companyName", event.target.value)
                    }
                    placeholder="Company name"
                    className="h-10 rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    required
                    value={form.location}
                    onChange={(event) =>
                      updateForm("location", event.target.value)
                    }
                    placeholder="Location"
                    className="h-10 rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    required
                    value={form.department}
                    onChange={(event) =>
                      updateForm("department", event.target.value)
                    }
                    placeholder="Department"
                    className="h-10 rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <select
                    value={form.employmentType}
                    onChange={(event) =>
                      updateForm(
                        "employmentType",
                        event.target.value as EmploymentType,
                      )
                    }
                    className="h-10 rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                  <select
                    value={form.workMode}
                    onChange={(event) =>
                      updateForm("workMode", event.target.value as WorkMode)
                    }
                    className="h-10 rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ON_SITE">On Site</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                  <input
                    value={form.salaryRange}
                    onChange={(event) =>
                      updateForm("salaryRange", event.target.value)
                    }
                    placeholder="Salary range (optional)"
                    className="h-10 rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    required
                    type="date"
                    value={form.deadline}
                    onChange={(event) =>
                      updateForm("deadline", event.target.value)
                    }
                    className="h-10 rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    required
                    value={form.tags}
                    onChange={(event) => updateForm("tags", event.target.value)}
                    placeholder="Tags (comma separated)"
                    className="md:col-span-2 h-10 rounded-lg border bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <textarea
                    required
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    placeholder="Job description"
                    rows={4}
                    className="md:col-span-2 rounded-lg border bg-secondary p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <DialogFooter className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingCreate}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {isSubmittingCreate ? "Creating..." : "Create Draft Job"}
                    </button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Jobs Feed Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-card-foreground">
          {roleView === "ALUMNI" ? "My Posted Jobs" : "All Jobs Feed"}
        </h2>

        {isLoadingJobs ? (
          <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<BriefcaseBusiness className="h-12 w-12" />}
            title="No jobs found"
            description="Try changing status or search filters."
          />
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <article key={job._id} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-card-foreground">
                    {job.title}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      statusStyles[(job.status || "DRAFT") as JobStatusFilter],
                    )}
                  >
                    {job.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {job.companyName} • {job.location}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {job.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {roleView === "ALUMNI" && job.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => handlePublishJob(job._id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Publish Job
                    </button>
                  )}

                  {roleView === "ALUMNI" && job.status !== "CLOSED" && (
                    <button
                      type="button"
                      onClick={() => handleCloseByOwner(job._id)}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Close Job
                    </button>
                  )}

                  {roleView === "ADMIN" && (
                    <button
                      type="button"
                      onClick={() => handleDeleteByAdmin(job._id)}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Delete as Admin
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default JobsManagementPage;
