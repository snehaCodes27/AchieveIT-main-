const API_BASE_URL = 'http://localhost:8000';

// Helper for HTTP requests with clean error message formatting
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Format error message cleanly
    let errorMsg = `Request failed with status ${response.status}`;
    if (typeof data?.detail === 'string') {
      errorMsg = data.detail;
    } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
      errorMsg = data.detail.map((err) => `${err.loc?.slice(-1)[0] || 'field'}: ${err.msg}`).join(', ');
    } else if (data?.message) {
      errorMsg = data.message;
    }
    throw new Error(errorMsg);
  }

  return data;
}

// ==========================================
// 1. AUTHENTICATION APIS
// ==========================================

export async function loginApi(collegeIdOrData, password, role) {
  let cid = '';
  let pwd = '';
  let r = role || 'student';

  if (typeof collegeIdOrData === 'object' && collegeIdOrData !== null) {
    cid = (collegeIdOrData.college_id || collegeIdOrData.collegeId || '').trim();
    pwd = collegeIdOrData.password || '';
    r = collegeIdOrData.role || r;
  } else {
    cid = (collegeIdOrData || '').trim();
    pwd = password || '';
  }

  // Sends both college_id and collegeId so backend schema matches
  const payload = {
    college_id: cid,
    collegeId: cid,
    password: pwd,
    role: r,
  };

  try {
    return await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err.message && err.message.includes('404')) {
      return await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    throw err;
  }
}

export async function registerApi(userData) {
  return await request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function changePasswordApi(currentPassword, newPassword) {
  return await request('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

// ==========================================
// 2. STUDENT ACHIEVEMENTS & OCR APIS
// ==========================================

export async function getMyAchievementsApi() {
  try {
    return await request('/api/v1/achievements/my');
  } catch (err) {
    try {
      return await request('/achievements/my');
    } catch {
      return [];
    }
  }
}

export async function submitAchievementApi(data) {
  const body = data instanceof FormData ? data : JSON.stringify(data);
  try {
    return await request('/api/v1/achievements/', {
      method: 'POST',
      body,
    });
  } catch (err) {
    return await request('/api/v1/achievements', {
      method: 'POST',
      body,
    });
  }
}

export async function scanCertificateApi(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('certificate', file);
  try {
    return await request('/api/v1/ocr/scan', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    try {
      return await request('/ocr/scan', {
        method: 'POST',
        body: formData,
      });
    } catch (e) {
      throw e;
    }
  }
}

// ==========================================
// 3. ADMIN / HOD & AI ASSISTANT APIS
// ==========================================

export async function getAllAchievementsApi() {
  try {
    return await request('/api/v1/achievements/all');
  } catch (err) {
    try {
      return await request('/api/v1/admin/achievements');
    } catch {
      try {
        return await request('/achievements/all');
      } catch {
        return [];
      }
    }
  }
}

export async function getUserStatsApi() {
  try {
    return await request('/api/v1/users/stats');
  } catch (err) {
    try {
      return await request('/users/stats');
    } catch {
      return null;
    }
  }
}

export async function exportAchievementsCsvApi() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/export/csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('API export not available');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IT_Achievements_${new Date().getFullYear()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    const data = await getAllAchievementsApi();
    const list = Array.isArray(data) ? data : data?.achievements || [];
    const headers = "ID,Name,CollegeID,Title,Category,Event,Position,Level,Date,Year\n";
    const rows = list
      .map(
        (a) =>
          `"${a.id || a._id || ""}","${a.studentName || a.name || ""}","${a.collegeId || ""}","${a.title || ""}","${a.category || ""}","${a.event || ""}","${a.position || ""}","${a.level || ""}","${a.date || a.issueDate || ""}","${a.year || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `IT_Achievements_${new Date().getFullYear()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export async function uploadUsersCsvApi(file, targetRole = 'student') {
  const formData = new FormData();
  formData.append('file', file);
  try {
    return await request(`/api/v1/users/upload-csv?target_role=${targetRole}`, {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    return await request(`/api/v1/admin/users/upload-csv?target_role=${targetRole}`, {
      method: 'POST',
      body: formData,
    });
  }
}

export async function askAiAssistantApi(query) {
  try {
    return await request('/api/v1/rag/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  } catch (err) {
    try {
      return await request('/rag/query', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
    } catch (e) {
      throw e;
    }
  }
}

// ==========================================
// 4. FACULTY MANAGEMENT APIS
// ==========================================

export async function getFacultyListApi() {
  try {
    return await request('/api/v1/users/faculty');
  } catch (err) {
    return [];
  }
}

export async function createFacultyApi(facultyData) {
  return await request('/api/v1/users/faculty', {
    method: 'POST',
    body: JSON.stringify(facultyData),
  });
}

export async function updateUserStatusApi(userId, status) {
  return await request(`/api/v1/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteFacultyApi(userId) {
  return await request(`/api/v1/users/faculty/${userId}`, {
    method: 'DELETE',
  });
}

// Aliases for compatibility
export const getStudentAchievementsApi = getMyAchievementsApi;
export const submitCertificateApi = submitAchievementApi;