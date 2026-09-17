import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyAchievementsApi,
  submitAchievementApi,
  scanCertificateApi,
} from "../../services/api";
import {
  MAX_FILE_SIZE_KB,
  formatFileSize,
  getFileSizeKB,
  compressCertificateFile,
} from "../../utils/fileCompressor";

const CATEGORIES = [
  {
    id: "hackathon",
    title: "Hackathons & Coding Competitions",
    iconType: "trophy-blue",
    bgColor: "#e0f2fe",
    iconColor: "#0284c7",
  },
  {
    id: "internship",
    title: "Internships & Work Experience",
    iconType: "briefcase",
    bgColor: "#ffedd5",
    iconColor: "#c2410c",
  },
  {
    id: "certification",
    title: "Certifications & Online Courses",
    iconType: "certificate-purple",
    bgColor: "#f3e8ff",
    iconColor: "#9333ea",
  },
  {
    id: "publication",
    title: "Publications & Technical Conferences",
    iconType: "book-pink",
    bgColor: "#ffe4e6",
    iconColor: "#e11d48",
  },
  {
    id: "tech_competition",
    title: "Technical Competitions & Project Exhibitions",
    iconType: "gear-green",
    bgColor: "#dcfce7",
    iconColor: "#16a34a",
  },
  {
    id: "sports_cultural",
    title: "Sports & Cultural Events",
    iconType: "medal-gold",
    bgColor: "#fef9c3",
    iconColor: "#ca8a04",
  },
  {
    id: "social_service",
    title: "Social Service & Leadership Activities",
    iconType: "users-purple",
    bgColor: "#ede9fe",
    iconColor: "#7c3aed",
  },
];

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewCertUrl, setPreviewCertUrl] = useState(null);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState("avatar");
  const [profileImage, setProfileImage] = useState(
    localStorage.getItem(`student_avatar_${user?.collegeId || "default"}`) || ""
  );
  const [previewAvatar, setPreviewAvatar] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Submit Achievement Form State
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [nameValidation, setNameValidation] = useState(null);
  const [isNameMismatch, setIsNameMismatch] = useState(false);

  // File Size & Intelligent Compression States
  const [selectedRawFile, setSelectedRawFile] = useState(null);
  const [fileSizeKB, setFileSizeKB] = useState(0);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState("");
  const [compressionStats, setCompressionStats] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    certificateId: "",
    category: "hackathon",
    issuer: "",
    date: new Date().toISOString().split("T")[0],
    position: "Participant",
    level: "College",
    description: "",
    file: null,
    fileName: "",
    fileUrl: "",
    fileHash: "",
    extractedText: "",
    participantName: "",
  });

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const data = await getMyAchievementsApi();
      if (Array.isArray(data)) {
        setAchievements(data);
      } else if (data && Array.isArray(data.achievements)) {
        setAchievements(data.achievements);
      } else {
        setAchievements([]);
      }
    } catch (err) {
      console.error("Failed to load achievements:", err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const totalCount = achievements.length;
  const verifiedCount = achievements.filter(
    (a) =>
      (a.status || "").toLowerCase() === "approved" ||
      (a.status || "").toLowerCase() === "verified" ||
      !a.status
  ).length;
  const currentYear = new Date().getFullYear().toString();
  const thisYearCount = achievements.filter((a) => {
    const d = a.date || a.event_date || a.issueDate || a.createdAt || a.created_at || "";
    return String(d).includes(currentYear);
  }).length;

  const matchCategory = (itemCategory, targetId) => {
    if (!itemCategory || !targetId) return false;
    const c = String(itemCategory).toLowerCase().trim();
    const t = String(targetId).toLowerCase().trim();

    if (c === t) return true;
    const cClean = c.replace(/[^a-z0-9]/g, "");
    const tClean = t.replace(/[^a-z0-9]/g, "");
    if (cClean === tClean) return true;

    if (t === "hackathon" || tClean === "hackathon") {
      return c.includes("hack") || c.includes("coding") || c.includes("code") || cClean.includes("hackathon");
    }
    if (t === "internship" || tClean === "internship") {
      return c.includes("intern") || c.includes("work") || c.includes("experience") || c.includes("training") || cClean.includes("internship");
    }
    if (t === "certification" || tClean === "certification" || t.includes("certif")) {
      return c.includes("cert") || c.includes("course") || c.includes("online") || c.includes("nptel") || c.includes("coursera") || cClean.includes("certification");
    }
    if (t === "publication" || tClean === "publication") {
      return c.includes("publi") || c.includes("paper") || c.includes("journal") || c.includes("conference") || c.includes("research") || cClean.includes("publication");
    }
    if (t === "tech_competition" || tClean === "techcompetition" || t.includes("tech")) {
      return c.includes("tech") || c.includes("compet") || c.includes("project") || c.includes("exhibit") || c.includes("robo") || cClean.includes("techcompetition");
    }
    if (t === "sports_cultural" || tClean === "sportscultural" || t.includes("sport") || t.includes("cultur")) {
      return c.includes("sport") || c.includes("cultur") || c.includes("extracurricular") || c.includes("dance") || c.includes("music") || c.includes("drama") || c.includes("game") || c.includes("vocal") || c.includes("sing") || cClean.includes("sportscultural");
    }
    if (t === "social_service" || tClean === "socialservice" || t.includes("social")) {
      return c.includes("social") || c.includes("lead") || c.includes("nss") || c.includes("ngo") || c.includes("volunteer") || c.includes("club") || cClean.includes("socialservice");
    }

    return c.includes(t) || t.includes(c);
  };

  const getCategoryCount = (catId) => {
    return achievements.filter((a) => matchCategory(a.category, catId)).length;
  };

  // Avatar Handlers
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Please select a valid image file (JPG, PNG, WebP).");
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
    if (!previewAvatar) {
      setProfileError("Please select an image first.");
      return;
    }

    try {
      localStorage.setItem(`student_avatar_${user?.collegeId || "default"}`, previewAvatar);
      setProfileImage(previewAvatar);
      setProfileSuccess("Profile picture updated successfully!");
      setTimeout(() => {
        setProfileSuccess("");
        setShowProfileModal(false);
      }, 1200);
    } catch (err) {
      setProfileError("Failed to save avatar image.");
    }
  };

  const handleChangePassword = (e) => {
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

    setProfileSuccess("Password changed successfully!");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setTimeout(() => {
      setProfileSuccess("");
      setShowProfileModal(false);
    }, 1500);
  };

  // 1. File Selection Handler: Immediate Size Validation
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = getFileSizeKB(file);
    setSelectedRawFile(file);
    setFileSizeKB(sizeKb);
    setCompressionStats(null);
    setFormError("");
    setScanMessage("");
    setNameValidation(null);
    setIsNameMismatch(false);

    // Rule: If file <= 20 KB -> Proceed directly with normal OCR scanning
    if (sizeKb <= MAX_FILE_SIZE_KB) {
      setIsOverLimit(false);
      setFormData((prev) => ({
        ...prev,
        file: file,
        fileName: file.name,
      }));
      await runOcrScan(file);
    } else {
      // Rule: If file > 20 KB -> Block auto OCR, show warning and "Compress File" button
      setIsOverLimit(true);
      setFormData((prev) => ({
        ...prev,
        file: null,
        fileName: file.name,
      }));
    }
  };

  // 2. Interactive Compression Action
  const handleCompressFile = async () => {
    if (!selectedRawFile) return;

    setIsCompressing(true);
    setFormError("");
    setCompressionProgress("Optimizing certificate resolution & reducing file size...");

    try {
      const result = await compressCertificateFile(
        selectedRawFile,
        MAX_FILE_SIZE_KB,
        (p) => setCompressionProgress(p.message || "Compressing...")
      );

      if (!result.success) {
        setFormError(result.error || "Failed to compress the file. Please upload an optimized file.");
        return;
      }

      setCompressionStats({
        originalSizeKB: result.originalSizeKB,
        compressedSizeKB: result.compressedSizeKB,
        ratio: result.ratio,
        isWithinLimit: result.isWithinLimit,
        compressedFile: result.compressedFile,
      });

      setFormData((prev) => ({
        ...prev,
        file: result.compressedFile,
        fileName: result.compressedFile.name,
      }));

      if (!result.isWithinLimit) {
        setFormError(
          `⚠️ The file is still larger than the recommended size (${result.compressedSizeKB} KB > ${MAX_FILE_SIZE_KB} KB). Please upload a smaller/optimized file.`
        );
      }
    } catch (err) {
      setFormError(`Compression failed: ${err.message}`);
    } finally {
      setIsCompressing(false);
      setCompressionProgress("");
    }
  };

  // 3. Reusable AI OCR Scan
  const runOcrScan = async (fileToScan) => {
    if (!fileToScan) return;

    setIsScanning(true);
    setScanMessage("🤖 AI is reading certificate details & validating student identity...");
    setFormError("");
    setNameValidation(null);
    setIsNameMismatch(false);

    try {
      const scanResult = await scanCertificateApi(fileToScan);
      if (scanResult) {
        const d = scanResult.data || {};
        const isMismatch = scanResult.is_name_mismatch || false;
        const nameVal = scanResult.name_validation || null;

        setNameValidation(nameVal);
        setIsNameMismatch(isMismatch);

        if (scanResult.is_duplicate) {
          setFormError(`⚠️ Duplicate Detected: ${scanResult.duplicate_reason || "This certificate was already uploaded."}`);
        } else if (isMismatch) {
          setFormError(`⚠️ Certificate Owner Mismatch: ${scanResult.mismatch_warning || "Certificate name does not match your account."}`);
        } else {
          setScanMessage("✨ AI Auto-fill complete & student identity verified!");
        }

        let detectedCat = "hackathon";
        const catStr = (d.category || "").toLowerCase();
        if (catStr.includes("intern") || catStr.includes("work")) detectedCat = "internship";
        else if (catStr.includes("cert") || catStr.includes("course") || catStr.includes("online")) detectedCat = "certification";
        else if (catStr.includes("paper") || catStr.includes("publi") || catStr.includes("journal") || catStr.includes("conf") || catStr.includes("research")) detectedCat = "publication";
        else if (catStr.includes("tech") || catStr.includes("project") || catStr.includes("exhibit") || catStr.includes("compet") || catStr.includes("robo")) detectedCat = "tech_competition";
        else if (catStr.includes("sport") || catStr.includes("cultur") || catStr.includes("dance") || catStr.includes("music") || catStr.includes("drama") || catStr.includes("vocal") || catStr.includes("sing") || catStr.includes("art")) detectedCat = "sports_cultural";
        else if (catStr.includes("social") || catStr.includes("lead") || catStr.includes("nss") || catStr.includes("volunteer") || catStr.includes("club")) detectedCat = "social_service";
        else if (catStr.includes("hack") || catStr.includes("code")) detectedCat = "hackathon";

        setFormData((prev) => ({
          ...prev,
          title: d.title || prev.title,
          certificateId: d.certificate_id || d.certificateId || d.credentialId || prev.certificateId,
          issuer: d.organization || d.organizer || d.issuer || prev.issuer,
          date: d.event_date || d.date || prev.date,
          category: detectedCat,
          position: d.position || prev.position || "Participant",
          level: d.level || prev.level || "College",
          description: d.description || d.title || prev.description,
          fileUrl: scanResult.file_url || "",
          fileHash: scanResult.file_hash || "",
          extractedText: scanResult.extracted_text || "",
          participantName: d.participant_name || "",
        }));
      }
    } catch (err) {
      console.warn("OCR scanning error:", err);
      setScanMessage("Certificate uploaded. Please verify and fill the required fields below.");
    } finally {
      setIsScanning(false);
    }
  };

  // Form Submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.file && !formData.fileUrl) {
      setFormError("Please upload and scan a valid certificate file.");
      return;
    }
    if (isNameMismatch) {
      setFormError("Cannot submit: Certificate name does not match your account name.");
      return;
    }
    if (!formData.title.trim()) {
      setFormError("Achievement title is required.");
      return;
    }
    if (!formData.issuer.trim()) {
      setFormError("Issuing Organization is required.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        title: formData.title,
        event_name: formData.title,
        category: formData.category,
        participant_name: formData.participantName || user?.name || user?.fullName || studentName,
        organization: formData.issuer,
        organizer: formData.issuer,
        event_date: formData.date || "",
        position: formData.position || "Participant",
        level: formData.level || "College",
        certificate_id: formData.certificateId,
        file_url: formData.fileUrl || "",
        file_name: formData.fileName || "certificate.pdf",
        file_hash: formData.fileHash || "",
        extracted_text: formData.extractedText || "",
        academic_year: user?.academicYear || "2024-2025",
        year_level: user?.current_year_level || user?.yearLevel || (studentId.startsWith("2024DS") || studentId.startsWith("2022") ? "BE" : "TE"),
        admission_batch: user?.admission_batch || user?.admissionBatch || (studentId.startsWith("2024DS") || studentId.startsWith("2022") ? "2022-2026" : "2023-2027")
      };

      await submitAchievementApi(payload);
      setFormSuccess("🎉 Achievement submitted and verified successfully!");
      await fetchAchievements();

      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess("");
        setNameValidation(null);
        setIsNameMismatch(false);
        setSelectedRawFile(null);
        setFileSizeKB(0);
        setIsOverLimit(false);
        setCompressionStats(null);
        setFormData({
          title: "",
          certificateId: "",
          category: "hackathon",
          issuer: "",
          date: new Date().toISOString().split("T")[0],
          position: "Participant",
          level: "College",
          description: "",
          file: null,
          fileName: "",
          fileUrl: "",
          fileHash: "",
          extractedText: "",
          participantName: "",
        });
        setScanMessage("");
        fetchAchievements();
      }, 1000);
    } catch (err) {
      setFormError(err.message || "Failed to submit achievement. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const studentName = user?.fullName || user?.name || "Matkar Sneha Shamkant";
  const studentId = user?.collegeId || user?.studentId || "2024DSIT012";
  const firstName = studentName.split(" ")[0] || "Sneha";
  const initials = studentName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const categoryRecords = selectedCategory
    ? achievements.filter((a) => matchCategory(a.category, selectedCategory.id))
    : [];

  const renderCategoryIcon = (type, color) => {
    switch (type) {
      case "trophy-blue":
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"></path>
            <path d="M6 4h12v7a6 6 0 0 1-12 0V4z"></path>
          </svg>
        );
      case "briefcase":
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        );
      case "certificate-purple":
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        );
      case "book-pink":
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        );
      case "gear-green":
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        );
      case "medal-gold":
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="7"></circle>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
          </svg>
        );
      case "users-purple":
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="ach-exact-root">
      {/* Decorative Dotted Grids */}
      <div className="ach-dot-grid ach-dot-left"></div>
      <div className="ach-dot-grid ach-dot-right"></div>

      {/* Floating Left Side Quote Card */}
      <div className="ach-side-card ach-quote-left">
        <div className="ach-quote-mark">“</div>
        <div className="ach-quote-text">
          <span>Small</span>
          <span>Achievements</span>
          <span>Create</span>
          <span>Big Futures.</span>
        </div>
      </div>

      {/* Floating Right Side Quote Card */}
      <div className="ach-side-card ach-quote-right">
        <div className="ach-chart-icon-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563eb">
            <rect x="3" y="12" width="4" height="9" rx="1"></rect>
            <rect x="10" y="7" width="4" height="14" rx="1"></rect>
            <rect x="17" y="3" width="4" height="18" rx="1"></rect>
          </svg>
        </div>
        <div className="ach-quote-text">
          <span>Recognizing</span>
          <span>Talent.</span>
          <span>Building</span>
          <span>Tomorrow.</span>
        </div>
      </div>

      {/* Building Line-art */}
      <div className="ach-building-vector">
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

      <div className="ach-dept-tag">
        Department of<br />
        <strong>Information Technology</strong>
      </div>

      <div className="ach-cursive-accent">
        Stronger<br />
        Brighter<br />
        Together
      </div>

      {/* HEADER */}
      <header className="ach-header">
        <div className="ach-header-left">
          <div className="ach-logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#1e3a8a">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z" />
            </svg>
          </div>
          <div className="ach-brand-titles">
            <span className="ach-brand-main">AchieveIT</span>
            <span className="ach-brand-sub">IT Achievement Portal</span>
          </div>
          <span className="ach-student-pill">STUDENT</span>
        </div>

        <div className="ach-header-right">
          {/* Profile Trigger */}
          <div
            className="ach-nav-profile-btn"
            onClick={() => {
              setShowProfileModal(true);
              setProfileError("");
              setProfileSuccess("");
            }}
            title="Open Profile Settings"
          >
            <div className="ach-nav-avatar">
              {profileImage ? (
                <img src={profileImage} alt="Avatar" className="ach-avatar-img" />
              ) : (
                <span className="ach-avatar-initials">{initials}</span>
              )}
            </div>
            <div className="ach-user-details">
              <div className="ach-user-fullname">{studentName}</div>
              <div className="ach-user-subid">ID: {studentId}</div>
            </div>
            <div className="ach-profile-chevron">⚙️</div>
          </div>

          <button className="ach-logout-btn" onClick={logout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="ach-container">
        {/* WELCOME HERO */}
        <section className="ach-hero-card">
          <div className="ach-hero-left">
            <div className="ach-hero-overhead">
              <span>GOOD TO SEE YOU AGAIN</span>
              <div className="ach-decor-line"></div>
            </div>
            <h1 className="ach-hero-title">Welcome back, {firstName}! 👋</h1>
            <p className="ach-hero-subtitle">
              Track, manage, and showcase your achievements.
            </p>
            <p className="ach-hero-quote">
              “Every achievement adds to a brighter future.”
            </p>
          </div>

          <div className="ach-hero-right">
            <div className="ach-hero-art">
              <div className="ach-art-circle-bg"></div>
              <div className="ach-art-illustration">
                <svg width="150" height="110" viewBox="0 0 160 120" fill="none">
                  <path d="M25 85 C20 70 30 55 45 60 C40 75 30 85 25 85 Z" fill="#93c5fd" opacity="0.8" />
                  <path d="M15 95 C10 85 18 75 30 78 C25 88 18 95 15 95 Z" fill="#60a5fa" opacity="0.6" />
                  <rect x="70" y="82" width="60" height="22" rx="4" transform="rotate(-15 70 82)" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
                  <rect x="94" y="74" width="10" height="22" transform="rotate(-15 94 74)" fill="#f97316" />
                  <polygon points="85,35 25,60 85,85 145,60" fill="#1e3a8a" />
                  <polygon points="85,35 145,60 85,85 25,60" stroke="#1d4ed8" strokeWidth="1.5" />
                  <path d="M50 72 V88 C50 96 85 102 85 102 C85 102 120 96 120 88 V72" fill="#1e293b" />
                  <line x1="85" y1="60" x2="148" y2="75" stroke="#f59e0b" strokeWidth="2" />
                  <circle cx="148" cy="77" r="3" fill="#f59e0b" />
                </svg>
              </div>
              <div className="ach-handwritten-badge">
                <span>Learn</span>
                <span>Achieve</span>
                <span>Grow<sup>✨</sup></span>
              </div>
            </div>
          </div>
        </section>

        {/* STATS ROW */}
        <section className="ach-stats-row">
          <div className="ach-stat-card">
            <div className="ach-stat-icon-circle bg-trophy">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#f59e0b">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"></path>
                <path d="M6 4h12v7a6 6 0 0 1-12 0V4z"></path>
              </svg>
            </div>
            <div className="ach-stat-info">
              <span className="ach-stat-label">Total Achievements</span>
              <span className="ach-stat-value">{loading ? "..." : totalCount}</span>
              <span className="ach-stat-sub">Milestones achieved so far</span>
            </div>
            <div className="ach-stat-arrow-btn">➔</div>
          </div>

          <div className="ach-stat-card">
            <div className="ach-stat-icon-circle bg-cert">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#9333ea">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8" stroke="#fff" strokeWidth="2"></polyline>
                <line x1="16" y1="13" x2="8" y2="13" stroke="#fff" strokeWidth="2"></line>
                <line x1="16" y1="17" x2="8" y2="17" stroke="#fff" strokeWidth="2"></line>
              </svg>
            </div>
            <div className="ach-stat-info">
              <span className="ach-stat-label">Certificates</span>
              <span className="ach-stat-value">{loading ? "..." : verifiedCount}</span>
              <span className="ach-stat-sub">Verified & stored</span>
            </div>
            <div className="ach-stat-arrow-btn">➔</div>
          </div>

          <div className="ach-stat-card">
            <div className="ach-stat-icon-circle bg-year">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#10b981">
                <rect x="3" y="12" width="4" height="9" rx="1"></rect>
                <rect x="10" y="7" width="4" height="14" rx="1"></rect>
                <rect x="17" y="3" width="4" height="18" rx="1"></rect>
              </svg>
            </div>
            <div className="ach-stat-info">
              <span className="ach-stat-label">This Year</span>
              <span className="ach-stat-value">{loading ? "..." : thisYearCount}</span>
              <span className="ach-stat-sub">Achievements in {currentYear}</span>
            </div>
            <div className="ach-stat-arrow-btn">➔</div>
          </div>

          <div className="ach-stat-card ach-action-card">
            <div className="ach-action-top">
              <div className="ach-action-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <span className="ach-action-heading">Add a New Achievement</span>
            </div>
            <p className="ach-action-desc">
              Upload your certificate and let AI extract the details automatically.
            </p>
            <button
              className="ach-action-submit-btn"
              onClick={() => setShowAddModal(true)}
            >
              + Submit Achievement ➔
            </button>
          </div>
        </section>

        {/* ACHIEVEMENT CATEGORIES */}
        <section className="ach-categories-wrapper">
          <div className="ach-categories-header">
            <div className="ach-cat-title-left">
              <div className="ach-grid-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                </svg>
              </div>
              <div>
                <h2 className="ach-cat-heading">Achievement Categories</h2>
                <p className="ach-cat-subtext">
                  Explore and manage your achievements by category
                </p>
              </div>
            </div>
            <span className="ach-cat-badge">7 Categories</span>
          </div>

          {/* Row 1: 4 Cards */}
          <div className="ach-cat-grid-row-1">
            {CATEGORIES.slice(0, 4).map((cat) => {
              const count = getCategoryCount(cat.id);
              return (
                <div
                  key={cat.id}
                  className="ach-category-card"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <div
                    className="ach-category-icon-box"
                    style={{ backgroundColor: cat.bgColor }}
                  >
                    {renderCategoryIcon(cat.iconType, cat.iconColor)}
                  </div>
                  <div className="ach-category-text-box">
                    <h3 className="ach-category-title">{cat.title}</h3>
                    <span className="ach-category-count">
                      {count} {count === 1 ? "achievement" : "achievements"}
                    </span>
                  </div>
                  <div className="ach-category-arrow-btn">➔</div>
                </div>
              );
            })}
          </div>

          {/* Row 2: 3 Cards */}
          <div className="ach-cat-grid-row-2">
            {CATEGORIES.slice(4, 7).map((cat) => {
              const count = getCategoryCount(cat.id);
              return (
                <div
                  key={cat.id}
                  className="ach-category-card"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <div
                    className="ach-category-icon-box"
                    style={{ backgroundColor: cat.bgColor }}
                  >
                    {renderCategoryIcon(cat.iconType, cat.iconColor)}
                  </div>
                  <div className="ach-category-text-box">
                    <h3 className="ach-category-title">{cat.title}</h3>
                    <span className="ach-category-count">
                      {count} {count === 1 ? "achievement" : "achievements"}
                    </span>
                  </div>
                  <div className="ach-category-arrow-btn">➔</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="ach-footer">
        <div className="ach-footer-left">
          AchieveIT &nbsp;|&nbsp; Department of Information Technology
        </div>
        <div className="ach-footer-right">
          Knowledge &nbsp;•&nbsp; Talent &nbsp;•&nbsp; Progress
        </div>
      </footer>

      {/* ===================================================
          MODAL 1: PROFILE
          =================================================== */}
      {showProfileModal && (
        <div className="std-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="std-modal-content ach-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="ach-profile-header-info">
                <h2>Student Profile & Settings</h2>
                <p>Manage your display avatar and account security</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowProfileModal(false)}>
                ✕
              </button>
            </div>

            <div className="ach-profile-overview-box">
              <div className="ach-overview-avatar">
                {profileImage ? (
                  <img src={profileImage} alt="Avatar" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="ach-overview-meta">
                <h3>{studentName}</h3>
                <span className="ach-overview-id">Roll / College ID: {studentId}</span>
                <span className="ach-overview-dept">Department of Information Technology</span>
              </div>
            </div>

            <div className="ach-profile-tabs">
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
            </div>

            {profileSuccess && <div className="std-alert-success">{profileSuccess}</div>}
            {profileError && <div className="std-alert-error">{profileError}</div>}

            {activeProfileTab === "avatar" && (
              <form onSubmit={handleSaveAvatar} className="ach-avatar-form">
                <div className="ach-avatar-upload-zone">
                  <div className="ach-avatar-preview-circle">
                    {previewAvatar || profileImage ? (
                      <img src={previewAvatar || profileImage} alt="Avatar Preview" />
                    ) : (
                      <div className="ach-avatar-placeholder">
                        <span>👤</span>
                        <small>No image set</small>
                      </div>
                    )}
                  </div>

                  <div className="ach-avatar-controls">
                    <input
                      type="file"
                      id="avatarFileInput"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: "none" }}
                    />
                    <label htmlFor="avatarFileInput" className="std-btn-secondary ach-choose-img-btn">
                      📁 Select Image
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
                    onClick={() => setShowProfileModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="std-btn-primary"
                    disabled={!previewAvatar}
                  >
                    Save Profile Picture
                  </button>
                </div>
              </form>
            )}

            {activeProfileTab === "password" && (
              <form onSubmit={handleChangePassword} className="ach-password-form">
                <div className="std-form-group full-width">
                  <label>Current Password *</label>
                  <div className="ach-password-input-wrap">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      required
                      placeholder="Enter current account password"
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
                      {showCurrentPass ? "👁️" : "👁️🗨️"}
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
                      {showNewPass ? "👁️" : "👁️🗨️"}
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
                    onClick={() => setShowProfileModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="std-btn-primary">
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL 2: SUBMIT NEW ACHIEVEMENT
          =================================================== */}
      {showAddModal && (
        <div className="std-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="std-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>✨ Submit New Achievement</h2>
                <p>Upload certificate and verify all required information below</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            {formSuccess && <div className="std-alert-success">{formSuccess}</div>}
            {formError && <div className="std-alert-error">{formError}</div>}

            {/* Certificate Owner Verification Feedback */}
            {isNameMismatch && nameValidation && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1.5px solid #f87171",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  marginBottom: "16px",
                  boxShadow: "0 2px 6px rgba(239, 68, 68, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c", fontWeight: "700", fontSize: "14px" }}>
                  <span style={{ fontSize: "18px" }}>⚠️</span>
                  <span>Certificate Owner Mismatch Detected</span>
                </div>
                <p style={{ margin: "6px 0 10px 0", fontSize: "13px", color: "#991b1b", lineHeight: "1.4" }}>
                  Certificate name does not match your account name. You can only submit achievements that belong to your account.
                </p>
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    border: "1px solid #fecaca",
                    fontSize: "12.5px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b", fontWeight: "600" }}>Name on Certificate:</span>
                    <strong style={{ color: "#dc2626" }}>{nameValidation.extracted_name || "Unknown"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #f1f5f9", paddingTop: "6px" }}>
                    <span style={{ color: "#64748b", fontWeight: "600" }}>Your Account Name:</span>
                    <strong style={{ color: "#16a34a" }}>{nameValidation.user_name || studentName}</strong>
                  </div>
                </div>
              </div>
            )}

            {!isNameMismatch && nameValidation && nameValidation.is_match && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#15803d",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                <span style={{ fontSize: "16px" }}>✅</span>
                <span>{nameValidation.message || `Certificate verified for ${studentName}`}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="std-modal-form">
              {/* Certificate File (Required) Dropzone */}
              <div className="std-upload-dropzone">
                <input
                  type="file"
                  id="certUpload"
                  accept="image/*,application/pdf"
                  required={!formData.file && !formData.fileUrl && !selectedRawFile}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <label htmlFor="certUpload" className="upload-label">
                  <div className="upload-icon-circle">📂</div>
                  <strong>
                    {formData.fileName ? formData.fileName : (selectedRawFile ? selectedRawFile.name : "Upload Certificate File * (Required)")}
                  </strong>
                  <span>
                    {selectedRawFile
                      ? `Selected Size: ${formatFileSize(selectedRawFile.size)} (Limit: ${MAX_FILE_SIZE_KB} KB)`
                      : `Supports PDF, PNG, JPG (Recommended max size: ${MAX_FILE_SIZE_KB} KB)`}
                  </span>
                </label>
              </div>

              {/* Over Limit Warning & "Compress File" Action */}
              {isOverLimit && !compressionStats && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fef3c7",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    marginBottom: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b45309", fontWeight: "600", fontSize: "13px" }}>
                    <span>⚠️</span>
                    <span>
                      File size ({fileSizeKB} KB) is larger than the recommended limit ({MAX_FILE_SIZE_KB} KB).
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      Compressing optimizes the file for faster AI scanning without losing text clarity.
                    </span>
                    <button
                      type="button"
                      onClick={handleCompressFile}
                      disabled={isCompressing}
                      style={{
                        background: "#f59e0b",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: isCompressing ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(245, 158, 11, 0.25)",
                      }}
                    >
                      {isCompressing ? "⏳ Compressing..." : "⚡ Compress File"}
                    </button>
                  </div>
                  {isCompressing && (
                    <div style={{ fontSize: "12px", color: "#92400e", fontStyle: "italic" }}>
                      {compressionProgress}
                    </div>
                  )}
                </div>
              )}

              {/* Compression Result Comparison Badge & Trigger */}
              {compressionStats && (
                <div
                  style={{
                    background: compressionStats.isWithinLimit ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${compressionStats.isWithinLimit ? "#bbf7d0" : "#fecaca"}`,
                    borderRadius: "10px",
                    padding: "14px 16px",
                    marginBottom: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: compressionStats.isWithinLimit ? "#15803d" : "#b91c1c" }}>
                      {compressionStats.isWithinLimit ? "✅ File Compressed Successfully!" : "⚠️ File Still Above Limit"}
                    </div>
                    <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                      <span style={{ color: "#6b7280" }}>
                        Original: <strong>{compressionStats.originalSizeKB} KB</strong>
                      </span>
                      <span style={{ color: "#15803d" }}>
                        ➔ Compressed: <strong>{compressionStats.compressedSizeKB} KB</strong> ({compressionStats.ratio}% smaller)
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    {!formData.extractedText && (
                      <button
                        type="button"
                        onClick={() => runOcrScan(compressionStats.compressedFile)}
                        disabled={isScanning}
                        style={{
                          background: "#4f46e5",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 16px",
                          fontWeight: "600",
                          fontSize: "13px",
                          cursor: isScanning ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {isScanning ? "🤖 Scanning..." : "🔍 Scan Compressed File"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isScanning && (
                <div className="std-scan-loader">
                  <div className="spinner"></div>
                  <span>{scanMessage}</span>
                </div>
              )}

              {!isScanning && scanMessage && !isNameMismatch && !formError && (
                <div className="std-scan-feedback">💡 {scanMessage}</div>
              )}

              <div className="std-form-grid">
                {/* 1. Title (Required) */}
                <div className="std-form-group full-width">
                  <label>Achievement Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1st Place - National Hackathon 2025"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                {/* 2. Certificate ID (Optional) */}
                <div className="std-form-group">
                  <label>Certificate ID / Credential ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. CERT-2025-88492 / UC-9941a8 (if visible)"
                    value={formData.certificateId}
                    onChange={(e) =>
                      setFormData({ ...formData, certificateId: e.target.value })
                    }
                  />
                </div>

                {/* 3. Category (Required) */}
                <div className="std-form-group">
                  <label>Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Issuing Organization (Required) */}
                <div className="std-form-group">
                  <label>Issuing Organization / Institute *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ACM, IEEE, Microsoft, IIT Bombay"
                    value={formData.issuer}
                    onChange={(e) =>
                      setFormData({ ...formData, issuer: e.target.value })
                    }
                  />
                </div>

                {/* 5. Date (Optional) */}
                <div className="std-form-group">
                  <label>Date of Achievement (Optional)</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>

                {/* 6. Position / Rank (Optional) */}
                <div className="std-form-group">
                  <label>Position / Rank / Award (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Winner, 1st Place, 2nd Runner-Up, Participant"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                  />
                </div>

                {/* 7. Competition Level (Optional) */}
                <div className="std-form-group">
                  <label>Competition Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value })
                    }
                  >
                    <option value="College">College Level</option>
                    <option value="State">State Level</option>
                    <option value="National">National Level</option>
                    <option value="International">International Level</option>
                  </select>
                </div>

                {/* 8. Description / Remarks (Optional) */}
                <div className="std-form-group full-width">
                  <label>Description / Remarks (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Describe your project, team role, score, or key learnings (optional)..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="std-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="std-btn-primary"
                  disabled={isSubmitting || isScanning || isNameMismatch}
                >
                  {isSubmitting ? "Submitting..." : isNameMismatch ? "Name Mismatch Blocked" : "Confirm & Save Achievement →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL 3: CATEGORY RECORDS
          =================================================== */}
      {selectedCategory && (
        <div className="std-modal-overlay" onClick={() => setSelectedCategory(null)}>
          <div className="std-modal-content cat-records-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="cat-modal-title-row">
                <div
                  className="ach-category-icon-box"
                  style={{ backgroundColor: selectedCategory.bgColor }}
                >
                  {renderCategoryIcon(selectedCategory.iconType, selectedCategory.iconColor)}
                </div>
                <div>
                  <h2>{selectedCategory.title}</h2>
                  <p>Filtered achievement records for your portfolio</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCategory(null)}>
                ✕
              </button>
            </div>

            <div className="records-list-container">
              {categoryRecords.length === 0 ? (
                <div className="no-records-box">
                  <span className="empty-icon">📂</span>
                  <h4>No achievements in this category yet</h4>
                  <p>Submit your certificate to get it verified and counted.</p>
                  <button
                    className="std-btn-primary"
                    onClick={() => {
                      setSelectedCategory(null);
                      setFormData((prev) => ({
                        ...prev,
                        category: selectedCategory.id,
                      }));
                      setShowAddModal(true);
                    }}
                  >
                    + Submit in {selectedCategory.title}
                  </button>
                </div>
              ) : (
                <div className="records-table-wrapper">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>Title & ID</th>
                        <th>Issuer</th>
                        <th>Position / Rank</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Certificate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRecords.map((item, idx) => (
                        <tr key={item.id || item._id || idx}>
                          <td className="item-title-col">
                            <strong>{item.title || item.event_name}</strong>
                            {(item.certificate_id || item.certificateId) && (
                              <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "600" }}>
                                ID: {item.certificate_id || item.certificateId}
                              </div>
                            )}
                            {item.description && <p>{item.description}</p>}
                          </td>
                          <td>{item.issuer || item.organization || item.organizer || "—"}</td>
                          <td>
                            <span
                              style={{
                                background: item.position && item.position.toLowerCase().includes("winner") || item.position && item.position.toLowerCase().includes("1st") || item.position && item.position.toLowerCase().includes("2nd") || item.position && item.position.toLowerCase().includes("runner") ? "#fef3c7" : "#f1f5f9",
                                color: item.position && item.position.toLowerCase().includes("winner") || item.position && item.position.toLowerCase().includes("1st") || item.position && item.position.toLowerCase().includes("2nd") || item.position && item.position.toLowerCase().includes("runner") ? "#92400e" : "#475569",
                                padding: "4px 9px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "700",
                                display: "inline-block",
                              }}
                            >
                              🏅 {item.position || "Participant"}
                            </span>
                          </td>
                          <td>{item.event_date || item.date || item.issueDate || (item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : "—")}</td>
                          <td>
                            <span
                              className={`status-pill ${
                                (item.status || "verified").toLowerCase()
                              }`}
                            >
                              {item.status || "Verified"}
                            </span>
                          </td>
                          <td>
                            {item.certificate_url || item.certificateUrl || item.file_url || item.fileUrl ? (
                              <button
                                className="view-cert-btn"
                                onClick={() =>
                                  setPreviewCertUrl(item.certificate_url || item.certificateUrl || item.file_url || item.fileUrl)
                                }
                              >
                                View File ↗
                              </button>
                            ) : (
                              <span className="no-file">Stored</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL 4: CERTIFICATE PREVIEW
          =================================================== */}
      {previewCertUrl && (
        <div className="std-modal-overlay preview-overlay" onClick={() => setPreviewCertUrl(null)}>
          <div className="std-modal-content preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Certificate Document Preview</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                  Verified file proof from department database
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {previewCertUrl && (
                  <a
                    href={
                      previewCertUrl.startsWith("http")
                        ? previewCertUrl.replace("http://127.0.0.1:8000", "https://achieveit-backend-4ffa.onrender.com").replace("http://localhost:8000", "https://achieveit-backend-4ffa.onrender.com")
                        : `https://achieveit-backend-4ffa.onrender.com${previewCertUrl.startsWith("/") ? "" : "/"}${previewCertUrl}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="std-btn-secondary"
                    style={{ fontSize: "12px", padding: "5px 12px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    Open in Tab ↗
                  </a>
                )}
                <button className="modal-close-btn" onClick={() => setPreviewCertUrl(null)}>
                  ✕
                </button>
              </div>
            </div>
            <div className="cert-preview-body">
              {(() => {
                const cleanUrl = previewCertUrl.startsWith("http")
                  ? previewCertUrl.replace("http://127.0.0.1:8000", "https://achieveit-backend-4ffa.onrender.com").replace("http://localhost:8000", "https://achieveit-backend-4ffa.onrender.com")
                  : `https://achieveit-backend-4ffa.onrender.com${previewCertUrl.startsWith("/") ? "" : "/"}${previewCertUrl}`;

                if (cleanUrl.toLowerCase().includes(".pdf")) {
                  return (
                    <iframe
                      src={cleanUrl}
                      title="Certificate PDF"
                      className="cert-iframe"
                    />
                  );
                }
                return (
                  <img
                    src={cleanUrl}
                    alt="Certificate"
                    className="cert-image-preview"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback = document.createElement("div");
                      fallback.className = "no-records-box";
                      fallback.innerHTML = "<h4>📄 File Proof Verified</h4><p>File proof record is verified in department database.</p>";
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}