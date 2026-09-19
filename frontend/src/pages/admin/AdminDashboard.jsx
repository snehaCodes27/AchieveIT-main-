import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getAllAchievementsApi,
  exportAchievementsCsvApi,
  uploadUsersCsvApi,
  askAiAssistantApi,
  getUserStatsApi,
  changePasswordApi,
  getFacultyListApi,
  createFacultyApi,
  updateUserStatusApi,
  deleteFacultyApi,
} from "../../services/api";

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const [achievements, setAchievements] = useState([]);
  const [userStats, setUserStats] = useState({
    total_users: 137,
    student_count: 135,
    teacher_count: 2,
    total_achievements: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modals & Active Views
  const [activeModal, setActiveModal] = useState(null);
  const [selectedYear, setSelectedYear] = useState("3rd Year");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("All");
  const [selectedBatch, setSelectedBatch] = useState("All");
  const [previewItem, setPreviewItem] = useState(null);

  // Profile Modal State
  const [adminAvatar, setAdminAvatar] = useState(
    localStorage.getItem("admin_avatar_HOD") || ""
  );
  const [previewAvatar, setPreviewAvatar] = useState("");
  const [activeProfileTab, setActiveProfileTab] = useState("password");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Search & Filters in Table
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");

  // AI Assistant Chat State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      sender: "ai",
      text: "Hello Admin / HOD! Ask me anything about department achievements, student rankings, participation trends, or generate summary reports.",
    },
  ]);

  // Upload Excel / CSV State (Student vs Professor)
  const [uploadFile, setUploadFile] = useState(null);
  const [targetRole, setTargetRole] = useState("student"); // "student" | "teacher"
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileError("Please select a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewAvatar(reader.result);
      setProfileError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = (e) => {
    e.preventDefault();
    if (!previewAvatar) return;
    localStorage.setItem("admin_avatar_HOD", previewAvatar);
    setAdminAvatar(previewAvatar);
    setProfileSuccess("HOD profile picture updated!");
    setTimeout(() => {
      setProfileSuccess("");
      setActiveModal(null);
    }, 1200);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!passwordForm.currentPassword) {
      setProfileError("Please enter your current password.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setProfileError("New password must be at least 6 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setProfileError("New passwords do not match.");
      return;
    }

    try {
      await changePasswordApi(passwordForm.currentPassword, passwordForm.newPassword);
      setProfileSuccess("HOD Admin password updated successfully!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setProfileSuccess("");
        setActiveModal(null);
      }, 1400);
    } catch (err) {
      setProfileError(err.message || "Failed to update password.");
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const stats = await getUserStatsApi();
      if (stats && stats.total_users !== undefined) {
        setUserStats(stats);
      }

      const data = await getAllAchievementsApi();
      if (Array.isArray(data)) {
        setAchievements(data);
      } else if (data && Array.isArray(data.achievements)) {
        setAchievements(data.achievements);
      } else {
        setAchievements([]);
      }
    } catch (err) {
      console.warn("Failed to fetch dashboard data:", err);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const totalUsers = userStats.total_users ?? 137;
  const totalAchievements = achievements.length;

  const countByYear = (yr) => {
    return achievements.filter((a) => {
      const y = (a.year_level || a.year || "").toLowerCase();
      const b = (a.admission_batch || a.batch || "").trim();
      if (yr === "1st Year") return y === "fe" || y.includes("1st") || b === "2026-2030";
      if (yr === "2nd Year") return y === "se" || y.includes("2nd") || b === "2025-2029";
      if (yr === "3rd Year") return y === "te" || y.includes("3rd") || b === "2024-2028";
      if (yr === "BE") return y === "be" || y.includes("4th") || b === "2023-2027";
      if (yr === "Graduated") return y.includes("grad") || a.status === "Graduated" || b === "2022-2026";
      return y === yr.toLowerCase();
    }).length;
  };

  // Filtered Table Records
  const getFilteredRecords = (isFaculty = false) => {
    return achievements.filter((item) => {
      const itemRole = (item.role || "student").toLowerCase();
      const isTeacher = itemRole === "teacher" || itemRole === "faculty";
      if (isFaculty !== isTeacher) return false;

      if (!isFaculty) {
        // Match Year Level
        if (selectedYear && selectedYear !== "All") {
          const y = (item.year_level || item.year || "").toLowerCase();
          const target = selectedYear.toLowerCase();
          const b = (item.admission_batch || item.batch || "").trim();
          const isMatchYear =
            y === target ||
            (target.includes("1st") && (y === "fe" || y.includes("1st") || b === "2026-2030")) ||
            (target.includes("2nd") && (y === "se" || y.includes("2nd") || b === "2025-2029")) ||
            (target.includes("3rd") && (y === "te" || y.includes("3rd") || b === "2024-2028")) ||
            (target.includes("be") && (y === "be" || y.includes("4th") || b === "2023-2027")) ||
            (target.includes("graduated") && (y.includes("grad") || item.status === "Graduated" || b === "2022-2026"));
          if (!isMatchYear) return false;
        }

        // Match Academic Year
        if (selectedAcademicYear !== "All") {
          const ay = (item.academic_year || item.academicYear || "").trim();
          if (ay && ay !== selectedAcademicYear) return false;
        }

        // Match Batch
        if (selectedBatch !== "All") {
          const b = (item.admission_batch || item.batch || "").trim();
          if (b && b !== selectedBatch) return false;
        }
      }

      const matchSearch =
        !searchQuery ||
        (item.student_name || item.studentName || item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.college_id || item.collegeId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.title || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat =
        categoryFilter === "All" ||
        (item.category || "").toLowerCase() === categoryFilter.toLowerCase();

      const matchLvl =
        levelFilter === "All" ||
        (item.level || "").toLowerCase() === levelFilter.toLowerCase();

      return matchSearch && matchCat && matchLvl;
    });
  };

  const handleExportCsv = async () => {
    try {
      if (exportAchievementsCsvApi) {
        await exportAchievementsCsvApi();
      }
    } catch (e) {
      alert("Failed to export report.");
    }
  };

  const handleSendAiPrompt = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const userText = aiPrompt;
    setAiMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setAiPrompt("");
    setAiLoading(true);

    try {
      let reply = "";
      if (askAiAssistantApi) {
        const res = await askAiAssistantApi(userText);
        reply = res?.answer || res?.reply || res?.message;
      }
      if (!reply) {
        reply = `Analysis: ${totalUsers} users provisioned, ${totalAchievements} recorded achievements in IT Department.`;
      }
      setAiMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Error connecting to AI service." },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Upload Excel / CSV Submit Handler
  const handleUploadUsersSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadStatus("Please select an Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }
    setIsUploading(true);
    setUploadStatus("");
    try {
      const result = await uploadUsersCsvApi(uploadFile, targetRole);
      setUploadStatus(
        `✅ ${result?.message || `Successfully imported ${targetRole === "teacher" ? "Professors" : "Students"} into database!`}`
      );
      fetchDashboardData();
      setTimeout(() => {
        setActiveModal(null);
        setUploadStatus("");
        setUploadFile(null);
      }, 1600);
    } catch (err) {
      setUploadStatus("Failed to upload: " + (err.message || "Invalid file format"));
    } finally {
      setIsUploading(false);
    }
  };

  // Faculty Management State & Handlers
  const [facultyList, setFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [facultySearch, setFacultySearch] = useState("");
  const [facultyStatusFilter, setFacultyStatusFilter] = useState("All");
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [addFacultyForm, setAddFacultyForm] = useState({
    college_id: "",
    name: "",
    email: "",
    department: "Information Technology",
    password: "Welcome@123",
  });
  const [addFacultyLoading, setAddFacultyLoading] = useState(false);
  const [facultyActionMsg, setFacultyActionMsg] = useState("");
  const [facultyActionError, setFacultyActionError] = useState("");

  const fetchFacultyList = async () => {
    try {
      setFacultyLoading(true);
      const data = await getFacultyListApi();
      setFacultyList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to fetch faculty list:", err);
    } finally {
      setFacultyLoading(false);
    }
  };

  const handleToggleFacultyStatus = async (facultyId, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    setFacultyActionMsg("");
    setFacultyActionError("");
    try {
      await updateUserStatusApi(facultyId, newStatus);
      setFacultyActionMsg(`Faculty status updated to ${newStatus}!`);
      await fetchFacultyList();
      await fetchDashboardData();
      setTimeout(() => setFacultyActionMsg(""), 2500);
    } catch (err) {
      setFacultyActionError(err.message || "Failed to update faculty status.");
      setTimeout(() => setFacultyActionError(""), 3000);
    }
  };

  const handleAddFacultySubmit = async (e) => {
    e.preventDefault();
    setFacultyActionMsg("");
    setFacultyActionError("");

    if (!addFacultyForm.college_id.trim() || !addFacultyForm.name.trim()) {
      setFacultyActionError("Faculty ID and Name are required.");
      return;
    }

    setAddFacultyLoading(true);
    try {
      await createFacultyApi(addFacultyForm);
      setFacultyActionMsg(`✅ Faculty ${addFacultyForm.name} added successfully!`);
      setAddFacultyForm({
        college_id: "",
        name: "",
        email: "",
        department: "Information Technology",
        password: "Welcome@123",
      });
      setShowAddFacultyModal(false);
      await fetchFacultyList();
      await fetchDashboardData();
      setTimeout(() => setFacultyActionMsg(""), 3000);
    } catch (err) {
      setFacultyActionError(err.message || "Failed to add faculty member.");
    } finally {
      setAddFacultyLoading(false);
    }
  };

  return (
    <div className="hod-exact-root">
      <div className="hod-dot-grid hod-dot-left"></div>
      <div className="hod-dot-grid hod-dot-right"></div>

      <div className="hod-side-card hod-quote-left">
        <div className="hod-quote-box">
          <span>Knowledge</span>
          <span>Drives</span>
          <span>Progress.</span>
        </div>
      </div>

      <div className="hod-side-card hod-quote-right">
        <div className="hod-quote-mark">“</div>
        <div className="hod-quote-box">
          <span>Recognize</span>
          <span>Enable</span>
          <span>Appreciate</span>
          <span>Grow.</span>
        </div>
      </div>

      <div className="hod-building-vector">
        <svg viewBox="0 0 280 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M140 10 L140 25 M135 25 H145 M140 25 C115 25 100 50 100 70 H180 C180 50 165 25 140 25 Z" stroke="#cbd5e1" strokeWidth="1.5" />
          <path d="M85 70 H195 L205 95 H75 Z" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="80" y="95" width="120" height="120" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="100" y1="95" x2="100" y2="215" stroke="#cbd5e1" strokeWidth="1.2" />
          <line x1="125" y1="95" x2="125" y2="215" stroke="#cbd5e1" strokeWidth="1.2" />
          <line x1="155" y1="95" x2="155" y2="215" stroke="#cbd5e1" strokeWidth="1.2" />
          <line x1="180" y1="95" x2="180" y2="215" stroke="#cbd5e1" strokeWidth="1.2" />
          <path d="M20 120 H80 V215 H20 Z" stroke="#cbd5e1" strokeWidth="1.2" />
          <path d="M200 120 H260 V215 H200 Z" stroke="#cbd5e1" strokeWidth="1.2" />
          <path d="M10 215 H270" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M5 222 H275" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M128 175 A12 12 0 0 1 152 175 V215 H128 Z" stroke="#cbd5e1" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="hod-dept-tag">
        DEPARTMENT OF<br />
        <strong>INFORMATION TECHNOLOGY</strong>
      </div>

      <div className="hod-cursive-accent">
        Stronger<br />
        Brighter<br />
        Together
      </div>

      {/* HEADER */}
      <header className="hod-header">
        <div className="hod-header-left">
          <div className="hod-logo-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#1e3a8a">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z" />
            </svg>
          </div>
          <div className="hod-brand-titles">
            <span className="hod-brand-main">AchieveIT — HOD Portal</span>
          </div>
          <span className="hod-admin-badge">ADMIN (HOD)</span>
        </div>

        <div className="hod-header-right">
          {/* HOD Profile Trigger */}
          <div
            className="ach-nav-profile-btn"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setActiveModal("profile");
              setProfileError("");
              setProfileSuccess("");
            }}
            title="Open HOD Admin Profile & Settings"
          >
            <div className="ach-nav-avatar" style={{ background: "#1e3a8a" }}>
              {adminAvatar ? (
                <img src={adminAvatar} alt="HOD Avatar" className="ach-avatar-img" />
              ) : (
                <span className="ach-avatar-initials" style={{ color: "#ffffff" }}>HOD</span>
              )}
            </div>
            <div className="hod-user-meta">
              <span className="hod-user-name">HOD Information Technology</span>
              <span className="hod-user-dept">Settings & Security ⚙️</span>
            </div>
          </div>

          <button className="hod-logout-btn" onClick={logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="hod-main-layout">
        <section className="hod-hero-banner">
          <div className="hod-hero-left">
            <span className="hod-hero-tag">DEPARTMENT DASHBOARD</span>
            <h1 className="hod-hero-title">Welcome, HOD 👋</h1>
            <p className="hod-hero-subtitle">
              Real-time analytics, AI Assistant & Report Generation for IT Department
            </p>
          </div>

          <div className="hod-hero-right">
            <div className="hod-hero-building-art">
              <svg width="130" height="75" viewBox="0 0 140 80" fill="none">
                <path d="M70 5 L70 12 M65 12 H75 M70 12 C55 12 45 28 45 38 H95 C95 28 85 12 70 12 Z" stroke="#ffffff" strokeWidth="1.4" opacity="0.85" />
                <rect x="35" y="38" width="70" height="38" stroke="#ffffff" strokeWidth="1.4" opacity="0.85" />
                <line x1="48" y1="38" x2="48" y2="76" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                <line x1="62" y1="38" x2="62" y2="76" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                <line x1="78" y1="38" x2="78" y2="76" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                <line x1="92" y1="38" x2="92" y2="76" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                <path d="M5 76 H135" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
              </svg>
            </div>
            <div className="hod-hero-quote-box">
              <p>“Empowering Achievements Building Future Leaders.”</p>
            </div>
          </div>
        </section>

        {/* STATS ROW */}
        <section className="hod-stats-row">
          {/* Card 1: IT Users Provisioned */}
          <div className="hod-stat-card">
            <div className="hod-card-top-row">
              <div className="hod-stat-icon-circle bg-users">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#2563eb">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="hod-stat-numbers">
                <span className="hod-stat-label">IT Users Provisioned</span>
                <span className="hod-stat-value">{loading ? "..." : totalUsers}</span>
                <span className="hod-stat-sub">Students & Faculty</span>
              </div>
            </div>
            <button
              className="hod-card-action-btn"
              onClick={() => {
                setActiveModal("upload");
                setUploadStatus("");
                setUploadFile(null);
              }}
            >
              📁 Upload Users (Excel / CSV) ➔
            </button>
          </div>

          {/* Card 2: Recorded Achievements */}
          <div className="hod-stat-card">
            <div className="hod-card-top-row">
              <div className="hod-stat-icon-circle bg-ach">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#10b981">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                  <path d="M4 22h16"></path>
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"></path>
                  <path d="M6 4h12v7a6 6 0 0 1-12 0V4z"></path>
                </svg>
              </div>
              <div className="hod-stat-numbers">
                <span className="hod-stat-label">Total Recorded Achievements</span>
                <span className="hod-stat-value">{loading ? "..." : totalAchievements}</span>
                <span className="hod-stat-sub">Department Achievements</span>
              </div>
            </div>
            <button className="hod-card-action-btn" onClick={handleExportCsv}>
              📊 Export Excel Report (.csv) ➔
            </button>
          </div>

          {/* Card 3: AI Assistant */}
          <div className="hod-stat-card">
            <div className="hod-card-top-row">
              <div className="hod-stat-icon-circle bg-ai">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#9333ea">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
                </svg>
              </div>
              <div className="hod-stat-numbers">
                <span className="hod-stat-label">AI Search Assistant</span>
                <p className="hod-ai-short-desc">
                  Ask questions about department achievements, trends and insights.
                </p>
              </div>
            </div>
            <button
              className="hod-ai-launch-btn"
              onClick={() => setActiveModal("aiAssistant")}
            >
              🤖 Ask AI Assistant (RAG) ➔
            </button>
          </div>
        </section>

        {/* ACHIEVEMENT MANAGEMENT */}
        <section className="hod-management-section">
          <div className="hod-section-header">
            <div className="hod-section-title-wrap">
              <span className="hod-sec-icon">👥</span>
              <div>
                <h2 className="hod-sec-heading">Achievement Management</h2>
                <p className="hod-sec-sub">View and manage achievements by user type</p>
              </div>
            </div>
          </div>

          <div className="hod-management-grid">
            <div className="hod-mgmt-card">
              <div className="hod-mgmt-left">
                <div className="hod-mgmt-icon-wrap bg-blue-subtle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#2563eb">
                    <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z" />
                  </svg>
                </div>
                <div className="hod-mgmt-info">
                  <h3>Student Achievements</h3>
                  <p>View and manage achievements submitted by IT department students.</p>
                  <span className="hod-mgmt-tagline">👥 Browse achievements by academic year</span>
                  <button
                    className="hod-btn-primary"
                    onClick={() => setActiveModal("yearSelect")}
                  >
                    View Student Achievements ➔
                  </button>
                </div>
              </div>

              <div className="hod-mgmt-art">
                <svg width="85" height="70" viewBox="0 0 100 80" fill="none">
                  <rect x="25" y="45" width="50" height="12" rx="2" fill="#bfdbfe" />
                  <rect x="20" y="57" width="60" height="14" rx="2" fill="#93c5fd" />
                  <polygon points="50,15 15,32 50,48 85,32" fill="#2563eb" />
                  <line x1="50" y1="32" x2="88" y2="42" stroke="#f59e0b" strokeWidth="2" />
                  <circle cx="88" cy="44" r="2.5" fill="#f59e0b" />
                </svg>
              </div>
            </div>

            <div className="hod-mgmt-card">
              <div className="hod-mgmt-left">
                <div className="hod-mgmt-icon-wrap bg-purple-subtle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#7c3aed">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div className="hod-mgmt-info">
                  <h3>Teacher Achievements</h3>
                  <p>View and manage achievements submitted by IT department faculty.</p>
                  <span className="hod-mgmt-tagline">👥 View faculty achievement records</span>
                  <button
                    className="hod-btn-purple"
                    onClick={() => setActiveModal("teacherTable")}
                  >
                    View Teacher Achievements ➔
                  </button>
                </div>
              </div>

              <div className="hod-mgmt-art">
                <svg width="85" height="70" viewBox="0 0 100 80" fill="none">
                  <rect x="40" y="15" width="48" height="35" rx="3" fill="#e9d5ff" stroke="#c084fc" strokeWidth="1.5" />
                  <line x1="46" y1="24" x2="75" y2="24" stroke="#7c3aed" strokeWidth="2" />
                  <line x1="46" y1="32" x2="68" y2="32" stroke="#a855f7" strokeWidth="1.5" />
                  <circle cx="28" cy="38" r="8" fill="#93c5fd" />
                  <path d="M16 68 C16 54 40 54 40 68" fill="#60a5fa" />
                </svg>
              </div>
            </div>

            <div className="hod-mgmt-card">
              <div className="hod-mgmt-left">
                <div className="hod-mgmt-icon-wrap" style={{ background: "#ede9fe" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#7c3aed">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div className="hod-mgmt-info">
                  <h3>Faculty Directory & Status</h3>
                  <p>View all professors, add new faculty, and toggle Active/Inactive status for job switches.</p>
                  <span className="hod-mgmt-tagline">👨‍🏫 Manage faculty lifecycle & status</span>
                  <button
                    className="hod-btn-purple"
                    onClick={() => {
                      fetchFacultyList();
                      setActiveModal("facultyDirectory");
                    }}
                  >
                    👨‍🏫 Faculty Directory & Status ➔
                  </button>
                </div>
              </div>

              <div className="hod-mgmt-art">
                <div style={{ fontSize: "40px", padding: "10px" }}>👨‍🏫</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL 1: YEAR SELECTOR */}
      {activeModal === "yearSelect" && (
        <div className="std-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="std-modal-content hod-year-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Student Achievements</h2>
                <p>Select an academic year level or graduate archive to view records</p>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>

            <div className="hod-years-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div className="hod-year-card">
                <div className="year-cap-icon">🎓</div>
                <h3>1st Year (FE)</h3>
                <p>View 1st Year (2026–2030) achievements</p>
                <div className="year-count-number">{countByYear("1st Year")}</div>
                <span className="year-sub">Records</span>
                <button
                  className="year-view-btn"
                  onClick={() => {
                    setSelectedYear("1st Year");
                    setActiveModal("studentTable");
                  }}
                >
                  View Records ➔
                </button>
              </div>

              <div className="hod-year-card">
                <div className="year-cap-icon">🎓</div>
                <h3>2nd Year (SE)</h3>
                <p>View 2nd Year (2025–2029) achievements</p>
                <div className="year-count-number">{countByYear("2nd Year")}</div>
                <span className="year-sub">Records</span>
                <button
                  className="year-view-btn"
                  onClick={() => {
                    setSelectedYear("2nd Year");
                    setActiveModal("studentTable");
                  }}
                >
                  View Records ➔
                </button>
              </div>

              <div className="hod-year-card">
                <div className="year-cap-icon">🎓</div>
                <h3>3rd Year (TE)</h3>
                <p>View 3rd Year (2024–2028) achievements</p>
                <div className="year-count-number">{countByYear("3rd Year")}</div>
                <span className="year-sub">Records</span>
                <button
                  className="year-view-btn"
                  onClick={() => {
                    setSelectedYear("3rd Year");
                    setActiveModal("studentTable");
                  }}
                >
                  View Records ➔
                </button>
              </div>

              <div className="hod-year-card active-year">
                <div className="year-cap-icon">🎓</div>
                <h3>BE (Final Year)</h3>
                <p>View BE (2023–2027) achievements</p>
                <div className="year-count-number">{countByYear("BE")}</div>
                <span className="year-sub">Records</span>
                <button
                  className="year-view-btn primary"
                  onClick={() => {
                    setSelectedYear("BE");
                    setActiveModal("studentTable");
                  }}
                >
                  View Records ➔
                </button>
              </div>

              <div className="hod-year-card" style={{ background: "#f8fafc", border: "1px solid #cbd5e1" }}>
                <div className="year-cap-icon">🏛️</div>
                <h3>Graduated / Alumni</h3>
                <p>Archived records of past batches</p>
                <div className="year-count-number">{countByYear("Graduated")}</div>
                <span className="year-sub">Archived</span>
                <button
                  className="year-view-btn"
                  style={{ background: "#475569", color: "#ffffff" }}
                  onClick={() => {
                    setSelectedYear("Graduated");
                    setActiveModal("studentTable");
                  }}
                >
                  View Archive ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORDS TABLE */}
      {(activeModal === "studentTable" || activeModal === "teacherTable") && (
        <div className="std-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="std-modal-content hod-table-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="table-modal-heading-row">
                {activeModal === "studentTable" && (
                  <button
                    className="hod-back-btn"
                    onClick={() => setActiveModal("yearSelect")}
                  >
                    ← Back to Years
                  </button>
                )}
                <div>
                  <h2>
                    {activeModal === "studentTable"
                      ? `${selectedYear} — Student Achievements`
                      : "Faculty Achievements Records"}
                  </h2>
                  <p>
                    {activeModal === "studentTable"
                      ? `Achievement records of ${selectedYear} IT students organized by academic year & batch`
                      : "Verified research, publications and grants by IT department faculty"}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>

            <div className="hod-table-filter-bar">
              <div className="hod-search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search achievements by student name, ID or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {activeModal === "studentTable" && (
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  style={{ fontWeight: "600", color: "#1e3a8a" }}
                >
                  <option value="All">All Academic Years</option>
                  <option value="2026-2027">2026-2027 (Current)</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2022-2023">2022-2023</option>
                </select>
              )}

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Hackathon">Hackathons</option>
                <option value="Internship">Internships</option>
                <option value="Certification">Certifications</option>
                <option value="Technical">Technical</option>
                <option value="Publication">Publications</option>
                <option value="Sports">Sports & Cultural</option>
              </select>

              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="All">All Levels</option>
                <option value="College">College</option>
                <option value="State">State</option>
                <option value="National">National</option>
                <option value="International">International</option>
              </select>
            </div>

            <div className="hod-records-table-wrap">
              <table className="hod-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>College ID</th>
                    <th>Batch</th>
                    <th>Academic Year</th>
                    <th>Achievement Title</th>
                    <th>Category</th>
                    <th>Position</th>
                    <th>Level</th>
                    <th>Date</th>
                    <th>Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredRecords(activeModal === "teacherTable").length === 0 ? (
                    <tr>
                      <td colSpan="11" className="no-data-cell">
                        No achievement records found in this category / academic year.
                      </td>
                    </tr>
                  ) : (
                    getFilteredRecords(activeModal === "teacherTable").map((row, idx) => (
                      <tr key={row.id || idx}>
                        <td>{idx + 1}</td>
                        <td><strong>{row.student_name || row.studentName || row.name || "—"}</strong></td>
                        <td className="mono-text">{row.college_id || row.collegeId || "—"}</td>
                        <td>
                          <span style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#475569", fontWeight: "600" }}>
                            {row.admission_batch || row.batch || "2023-2027"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "11.5px", color: "#2563eb", fontWeight: "600" }}>
                            {row.academic_year || "2024-2025"}
                          </span>
                        </td>
                        <td>{row.title}</td>
                        <td>
                          <span className="hod-cat-pill">{row.category || "General"}</span>
                        </td>
                        <td>{row.position || "Participant"}</td>
                        <td>
                          <span className="hod-level-pill">{row.level || "College"}</span>
                        </td>
                        <td>{row.event_date || row.date || "—"}</td>
                        <td>
                          {row.certificate_url || row.certificateUrl ? (
                            <button
                              className="hod-view-cert-btn"
                              onClick={() => {
                                setPreviewItem({
                                  ...row,
                                  certificateUrl: row.certificate_url || row.certificateUrl
                                });
                                setActiveModal("certPreview");
                              }}
                            >
                              👁 View
                            </button>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>Stored</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="hod-table-footer">
              <span>
                Showing {getFilteredRecords(activeModal === "teacherTable").length} records
              </span>
              <div className="pagination-mock">
                <button disabled>‹</button>
                <button className="active">1</button>
                <button disabled>›</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CERTIFICATE PREVIEW */}
      {activeModal === "certPreview" && previewItem && (
        <div className="std-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="std-modal-content hod-cert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Certificate Preview & Verification</h3>
              <button className="modal-close-btn" onClick={() => setActiveModal("studentTable")}>
                ✕
              </button>
            </div>

            <div className="hod-cert-modal-body">
              <div className="cert-preview-left">
                {previewItem.certificateUrl ? (
                  <img
                    src={previewItem.certificateUrl}
                    alt="Certificate"
                    className="cert-img-render"
                  />
                ) : (
                  <div className="cert-placeholder-box">
                    <span>📜</span>
                    <p>Verified Certificate Record</p>
                  </div>
                )}
              </div>

              <div className="cert-preview-meta">
                <h4>Achievement Details</h4>
                <div className="meta-item">
                  <label>Student Name</label>
                  <span>{previewItem.studentName || previewItem.name}</span>
                </div>
                <div className="meta-item">
                  <label>College ID</label>
                  <span>{previewItem.collegeId}</span>
                </div>
                <div className="meta-item">
                  <label>Title</label>
                  <span>{previewItem.title}</span>
                </div>
                <div className="meta-item">
                  <label>Category</label>
                  <span>{previewItem.category}</span>
                </div>
                <div className="meta-item">
                  <label>Event</label>
                  <span>{previewItem.event || "—"}</span>
                </div>
                <div className="meta-item">
                  <label>Position</label>
                  <span>{previewItem.position || "Participant"}</span>
                </div>
                <div className="meta-item">
                  <label>Level</label>
                  <span>{previewItem.level || "College"}</span>
                </div>
                <div className="meta-item">
                  <label>Date</label>
                  <span>{previewItem.date || "—"}</span>
                </div>

                <div className="cert-actions-row">
                  <a
                    href={previewItem.certificateUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="hod-btn-primary full-width"
                  >
                    Download Certificate ⬇
                  </a>
                  <button
                    className="hod-btn-secondary full-width"
                    onClick={() => setActiveModal("studentTable")}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: AI SEARCH ASSISTANT */}
      {activeModal === "aiAssistant" && (
        <div className="std-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="std-modal-content hod-ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="ai-modal-title">
                <span className="ai-sparkle">✨</span>
                <div>
                  <h2>Department AI Search Assistant (RAG)</h2>
                  <p>Ask questions in plain English to analyze IT achievement records</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>

            <div className="ai-chat-messages">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`ai-msg-bubble ${msg.sender}`}>
                  <strong>{msg.sender === "ai" ? "🤖 AI Assistant" : "👤 HOD"}:</strong>
                  <p>{msg.text}</p>
                </div>
              ))}
              {aiLoading && (
                <div className="ai-msg-bubble ai loading">
                  <span>Thinking & Searching RAG Index...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSendAiPrompt} className="ai-input-form">
              <input
                type="text"
                placeholder="e.g. How many students participated in national hackathons this year?"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <button type="submit" disabled={aiLoading || !aiPrompt.trim()}>
                Send ➔
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL 6: HOD PROFILE & PASSWORD SETTINGS
          =================================================== */}
      {activeModal === "profile" && (
        <div className="std-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="std-modal-content ach-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="ach-profile-header-info">
                <h2>HOD Admin Settings</h2>
                <p>Manage HOD display avatar and administrative security</p>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>

            <div className="ach-profile-overview-box">
              <div className="ach-overview-avatar" style={{ background: "#1e3a8a" }}>
                {adminAvatar ? (
                  <img src={adminAvatar} alt="HOD Avatar" />
                ) : (
                  <span style={{ color: "#ffffff", fontWeight: "800" }}>HOD</span>
                )}
              </div>
              <div className="ach-overview-meta">
                <h3>HOD Information Technology</h3>
                <span className="ach-overview-id">Role: Department Head / Administrator</span>
                <span className="ach-overview-dept">Department of Information Technology</span>
              </div>
            </div>

            <div className="ach-profile-tabs">
              <button
                className={`ach-tab-btn ${activeProfileTab === "password" ? "active" : ""}`}
                onClick={() => {
                  setActiveProfileTab("password");
                  setProfileError("");
                  setProfileSuccess("");
                }}
              >
                🔒 Change Password
              </button>
              <button
                className={`ach-tab-btn ${activeProfileTab === "avatar" ? "active" : ""}`}
                onClick={() => {
                  setActiveProfileTab("avatar");
                  setProfileError("");
                  setProfileSuccess("");
                }}
              >
                📸 Profile Picture
              </button>
            </div>

            {profileSuccess && <div className="std-alert-success">{profileSuccess}</div>}
            {profileError && <div className="std-alert-error">{profileError}</div>}

            {activeProfileTab === "password" && (
              <form onSubmit={handleChangePassword} className="ach-password-form">
                <div className="std-form-group full-width">
                  <label>Current Password *</label>
                  <div className="ach-password-input-wrap">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      required
                      placeholder="Enter current HOD password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="ach-pass-toggle"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                    >
                      {showCurrentPass ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div className="std-form-group full-width">
                  <label>New Password *</label>
                  <div className="ach-password-input-wrap">
                    <input
                      type={showNewPass ? "text" : "password"}
                      required
                      placeholder="Enter at least 6 characters"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="ach-pass-toggle"
                      onClick={() => setShowNewPass(!showNewPass)}
                    >
                      {showNewPass ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div className="std-form-group full-width">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="std-btn-secondary"
                    onClick={() => setActiveModal(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="std-btn-primary">
                    Update HOD Password
                  </button>
                </div>
              </form>
            )}

            {activeProfileTab === "avatar" && (
              <form onSubmit={handleSaveAvatar} className="ach-avatar-form">
                <div className="ach-avatar-upload-zone">
                  <div className="ach-avatar-preview-circle">
                    {previewAvatar || adminAvatar ? (
                      <img src={previewAvatar || adminAvatar} alt="Avatar Preview" />
                    ) : (
                      <div className="ach-avatar-placeholder">
                        <span>🏛️</span>
                        <small>No image set</small>
                      </div>
                    )}
                  </div>

                  <div className="ach-avatar-controls">
                    <input
                      type="file"
                      id="hodAvatarFileInput"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: "none" }}
                    />
                    <label htmlFor="hodAvatarFileInput" className="std-btn-secondary ach-choose-img-btn">
                      📁 Select Photo
                    </label>
                    <span className="ach-avatar-hint">
                      Recommended: Square JPG or PNG, max 2MB
                    </span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="std-btn-secondary"
                    onClick={() => setActiveModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="std-btn-primary"
                    disabled={!previewAvatar}
                  >
                    Save Photo
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: BULK USER / FACULTY EXCEL IMPORT */}
      {activeModal === "upload" && (
        <div className="std-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="std-modal-content" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📥 Import Users / Faculty (Excel & CSV)</h2>
                <p>Bulk upload faculty professors or student master data to department database</p>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>

            {uploadStatus && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  background: uploadStatus.includes("✅") ? "#f0fdf4" : "#fef2f2",
                  color: uploadStatus.includes("✅") ? "#15803d" : "#b91c1c",
                  border: `1px solid ${uploadStatus.includes("✅") ? "#bbf7d0" : "#fecaca"}`,
                }}
              >
                {uploadStatus}
              </div>
            )}

            <form onSubmit={handleUploadUsersSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "10px" }}>
              {/* Target Role Selector */}
              <div className="std-form-group">
                <label style={{ fontWeight: "700", marginBottom: "6px" }}>Select User Type to Import *</label>
                <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                  <label
                    style={{
                      flex: 1,
                      border: `1.5px solid ${targetRole === "teacher" ? "#7c3aed" : "#cbd5e1"}`,
                      background: targetRole === "teacher" ? "#f3e8ff" : "#ffffff",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontWeight: targetRole === "teacher" ? "700" : "500",
                    }}
                  >
                    <input
                      type="radio"
                      name="targetRole"
                      value="teacher"
                      checked={targetRole === "teacher"}
                      onChange={() => setTargetRole("teacher")}
                    />
                    <span>👨‍🏫 Faculty / Teachers</span>
                  </label>

                  <label
                    style={{
                      flex: 1,
                      border: `1.5px solid ${targetRole === "student" ? "#2563eb" : "#cbd5e1"}`,
                      background: targetRole === "student" ? "#e0f2fe" : "#ffffff",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontWeight: targetRole === "student" ? "700" : "500",
                    }}
                  >
                    <input
                      type="radio"
                      name="targetRole"
                      value="student"
                      checked={targetRole === "student"}
                      onChange={() => setTargetRole("student")}
                    />
                    <span>🎓 Students</span>
                  </label>
                </div>
              </div>

              {/* File Dropzone */}
              <div className="std-upload-dropzone" style={{ padding: "20px" }}>
                <input
                  type="file"
                  id="adminExcelUpload"
                  accept=".xlsx,.xls,.csv"
                  required
                  onChange={(e) => {
                    setUploadFile(e.target.files?.[0] || null);
                    setUploadStatus("");
                  }}
                  style={{ display: "none" }}
                />
                <label htmlFor="adminExcelUpload" className="upload-label">
                  <div className="upload-icon-circle" style={{ fontSize: "28px" }}>📊</div>
                  <strong>
                    {uploadFile ? uploadFile.name : "Choose Excel / CSV File *"}
                  </strong>
                  <span>
                    {uploadFile
                      ? `Selected size: ${(uploadFile.size / 1024).toFixed(1)} KB`
                      : "Supports .xlsx, .xls, .csv (Headers: ID, Name)"}
                  </span>
                </label>
              </div>

              <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#475569", lineHeight: "1.5" }}>
                💡 <strong>Format Guide:</strong> Excel file should contain columns for <strong>Faculty ID / Employee ID</strong> and <strong>Faculty Name</strong>. Default password will be set to <code>Welcome@123</code>.
              </div>

              <div className="modal-actions" style={{ marginTop: "6px" }}>
                <button
                  type="button"
                  className="std-btn-secondary"
                  onClick={() => {
                    setActiveModal(null);
                    setUploadFile(null);
                    setUploadStatus("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="std-btn-primary"
                  disabled={!uploadFile || isUploading}
                  style={{ background: "#16a34a", borderColor: "#15803d" }}
                >
                  {isUploading ? "⏳ Uploading & Provisioning..." : "🚀 Upload & Import Excel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FACULTY DIRECTORY & STATUS MANAGEMENT */}
      {activeModal === "facultyDirectory" && (
        <div className="std-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="std-modal-content" style={{ maxWidth: "920px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "28px" }}>👨‍🏫</div>
                <div>
                  <h2>Faculty Directory & Status Management</h2>
                  <p>Manage department professors, toggle Active/Inactive lifecycle, and add new faculty</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  className="std-btn-primary"
                  style={{ background: "#7c3aed", padding: "8px 16px", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={() => {
                    setFacultyActionError("");
                    setFacultyActionMsg("");
                    setShowAddFacultyModal(true);
                  }}
                >
                  + Add New Faculty
                </button>
                <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                  ✕
                </button>
              </div>
            </div>

            {facultyActionMsg && (
              <div className="std-alert-success" style={{ marginBottom: "12px" }}>
                {facultyActionMsg}
              </div>
            )}
            {facultyActionError && (
              <div className="std-alert-error" style={{ marginBottom: "12px" }}>
                {facultyActionError}
              </div>
            )}

            {/* Filter & Search Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px", padding: "12px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Status Filter:</span>
                {["All", "Active", "Inactive"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFacultyStatusFilter(st)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "20px",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: facultyStatusFilter === st ? "#1e3a8a" : "#e2e8f0",
                      color: facultyStatusFilter === st ? "#ffffff" : "#475569",
                    }}
                  >
                    {st === "Active" ? "🟢 Active" : st === "Inactive" ? "🔴 Inactive" : "All Faculty"}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search faculty name or ID..."
                  value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12.5px",
                    minWidth: "220px",
                  }}
                />
              </div>
            </div>

            {/* Faculty Table */}
            <div className="records-table-wrapper" style={{ maxHeight: "420px", overflowY: "auto" }}>
              {facultyLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  <div className="spinner"></div>
                  <p>Loading faculty directory...</p>
                </div>
              ) : (
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Faculty ID</th>
                      <th>Faculty Name</th>
                      <th>Achievements</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyList
                      .filter((f) => {
                        const matchFilter =
                          facultyStatusFilter === "All" ||
                          (f.status || "Active").toLowerCase() === facultyStatusFilter.toLowerCase();
                        const q = facultySearch.toLowerCase();
                        const matchSearch =
                          !q ||
                          (f.name || "").toLowerCase().includes(q) ||
                          (f.college_id || "").toLowerCase().includes(q);
                        return matchFilter && matchSearch;
                      })
                      .map((fac) => {
                        const isActive = (fac.status || "Active").toLowerCase() === "active";
                        return (
                          <tr key={fac.id} style={{ opacity: isActive ? 1 : 0.65 }}>
                            <td>
                              <strong style={{ color: "#1e3a8a" }}>{fac.college_id}</strong>
                            </td>
                            <td>
                              <div style={{ fontWeight: "600", color: "#1e293b" }}>{fac.name}</div>
                              <span style={{ fontSize: "11px", color: "#64748b" }}>{fac.department}</span>
                            </td>
                            <td>
                              <span
                                style={{
                                  background: "#f1f5f9",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  color: "#334155",
                                }}
                              >
                                📜 {fac.achievements_count} recorded
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  background: isActive ? "#dcfce7" : "#fee2e2",
                                  color: isActive ? "#15803d" : "#b91c1c",
                                  padding: "4px 9px",
                                  borderRadius: "12px",
                                  fontSize: "11.5px",
                                  fontWeight: "700",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {isActive ? "🟢 Active" : "🔴 Inactive (Relieved)"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => handleToggleFacultyStatus(fac.id, fac.status || "Active")}
                                style={{
                                  background: isActive ? "#fee2e2" : "#dcfce7",
                                  color: isActive ? "#b91c1c" : "#15803d",
                                  border: `1px solid ${isActive ? "#fca5a5" : "#86efac"}`,
                                  borderRadius: "6px",
                                  padding: "5px 10px",
                                  fontSize: "11.5px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                                title={isActive ? "Deactivate for Job Switch" : "Reactivate Faculty Account"}
                              >
                                {isActive ? "Mark Inactive ➔" : "Reactivate ➔"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: ADD NEW FACULTY MEMBER */}
      {showAddFacultyModal && (
        <div className="std-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowAddFacultyModal(false)}>
          <div className="std-modal-content" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>➕ Add New Faculty Member</h3>
                <p style={{ fontSize: "12px", color: "#64748b" }}>Create faculty credentials and activate account</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddFacultyModal(false)}>
                ✕
              </button>
            </div>

            {facultyActionError && <div className="std-alert-error">{facultyActionError}</div>}

            <form onSubmit={handleAddFacultySubmit} className="std-modal-form" style={{ marginTop: "8px" }}>
              <div className="std-form-group full-width">
                <label>Faculty ID / Employee ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 16099 / 2024DITP18"
                  value={addFacultyForm.college_id}
                  onChange={(e) => setAddFacultyForm({ ...addFacultyForm, college_id: e.target.value })}
                />
              </div>

              <div className="std-form-group full-width">
                <label>Full Name (with Prefix) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh M. Joshi / Prof. Sneha Sharma"
                  value={addFacultyForm.name}
                  onChange={(e) => setAddFacultyForm({ ...addFacultyForm, name: e.target.value })}
                />
              </div>

              <div className="std-form-group full-width">
                <label>Default Initial Password</label>
                <input
                  type="text"
                  value={addFacultyForm.password}
                  onChange={(e) => setAddFacultyForm({ ...addFacultyForm, password: e.target.value })}
                />
                <small style={{ color: "#64748b", fontSize: "11px" }}>
                  Faculty can change their password anytime in their profile settings.
                </small>
              </div>

              <div className="modal-actions" style={{ marginTop: "10px" }}>
                <button
                  type="button"
                  className="std-btn-secondary"
                  onClick={() => setShowAddFacultyModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="std-btn-primary"
                  style={{ background: "#7c3aed" }}
                  disabled={addFacultyLoading}
                >
                  {addFacultyLoading ? "Creating..." : "Save & Activate Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}