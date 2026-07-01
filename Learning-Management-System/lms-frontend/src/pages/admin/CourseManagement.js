import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Switch,  
  Alert,
  Divider,
  Chip,
  CircularProgress,
  Autocomplete,
  Card,
  CardContent,
  Stack
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Quiz as QuizIcon,
  Search as SearchIcon,
  ArrowUpward,
  ArrowDownward,
  MarkEmailUnread as MarkEmailUnreadIcon
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../../api";
import { useAuth } from '../../contexts/AuthContext';


// Constants
const DEFAULT_PAGE_SIZE = 5;

const emptyQuiz = {
  title: "",
  description: "",
  passing_score: 70,
  total_score: 100, // Add total score
  questions: [],
  is_final: false,
  course: null
};

const emptyQuestion = {
  question_text: "",
  score: 10, // Add individual question score
  choices: [{ text: "", is_correct: false }]
};

// Utility Functions
const formatUTCDateTime = (date) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return "";
  }
};

const reorderArray = (arr, fromIdx, toIdx) => {
  const copy = [...arr];
  const [removed] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, removed);
  return copy.map((item, idx) => ({ ...item, order: idx + 1 }));
};

const getCourseCategoryNames = (course) => {
  const categoryValue = course?.category;
  if (Array.isArray(categoryValue)) {
    return categoryValue
      .map((cat) => {
        if (typeof cat === "object" && cat !== null) return String(cat.name || "");
        if (typeof cat === "string") return cat;
        return "";
      })
      .filter(Boolean);
  }

  if (categoryValue && typeof categoryValue === "object" && categoryValue.name) {
    return [String(categoryValue.name)];
  }

  if (typeof categoryValue === "string") {
    return [categoryValue];
  }

  return [];
};

const DataGridErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => setHasError(false)}>
            Retry
          </Button>
        }
      >
        An error occurred while loading the data grid. Please try refreshing the page.
      </Alert>
    );
  }

  return children;
};

const CourseManagement = () => {
  // State Management

  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoFormData, setVideoFormData] = useState({
    title: "",
    description: "",
    video_files: [],
    order: 1
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: [],
    is_active: true,
    cover_image: null,
    certificate_template: null,
    staff_signature_text: "",
  });
  const [videoQuizzes, setVideoQuizzes] = useState({});
  const [finalQuiz, setFinalQuiz] = useState(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [enableQuizzes, setEnableQuizzes] = useState(true); // default is enabled
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [saving, setSaving] = useState(false);

  const [snackbar, setSnackbar] = useState({
  open: false,
  message: '',
  severity: 'success',
});

const showSnackbar = (message, severity = 'success') => {
  setSnackbar({
    open: true,
    message,
    severity,
  });
};

const handleCloseSnackbar = () => {
  setSnackbar((prev) => ({ ...prev, open: false }));
};


  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const [isCategoryInputFocused, setIsCategoryInputFocused] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState('');

  // Request dialog state
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  const handleAddCategory = async () => {
  if (!newCategoryName.trim()) {
    setCategoryError("Category name cannot be empty.");
    return;
  }

  try {
    setCategoryError('');
    const response = await api.post("/categories/", {
      name: newCategoryName,
      description: "",
    });
    setCategories((prev) => [...prev, response.data]);
    setFormData((prev) => ({
      ...prev,
      category: [...prev.category, String(response.data.id)],
    }));
    setNewCategoryName('');
  } catch (error) {
    console.error("Failed to add category:", error);
    if (error.response?.data?.name) {
      setCategoryError(error.response.data.name.join(", "));
    } else {
      setCategoryError("An error occurred while adding the category.");
    }
  }
};


  // Initial Data Loading
  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchCourses(),
        fetchCategories()
      ]);
    } catch (error) {
      setError("Failed to load initial data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // API Calls
  const fetchCourses = async () => {
    try {
      const response = await api.get("/courses/");
      const coursesData = Array.isArray(response.data) ? response.data : [];
      const validCourses = coursesData.filter(course =>
        course && typeof course === 'object' && course.id
      );
      setCourses(validCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw error;
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories/");
      const categoriesData = Array.isArray(response.data) ? response.data : [];
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  };

  const fetchCourseVideos = async (courseId) => {
    if (!courseId) {
      setVideos([]);
      return [];
    }
    try {
      const response = await api.get(`/courses/${courseId}/videos/`);
      const vids = Array.isArray(response.data) ? response.data : [];
      const sortedVideos = vids.sort((a, b) => a.order - b.order);
      setVideos(sortedVideos);
      return sortedVideos;
    } catch (error) {
      console.error("Error fetching videos:", error);
      setVideos([]);
      return [];
    }
  };

  const fetchVideoQuizzes = async (courseId) => {
    if (!courseId) return;
    try {
      const response = await api.get(`/quizzes/?course=${courseId}`);
      const quizzes = Array.isArray(response.data) ? response.data : [];
      const vidQuizzes = {};
      let currentFinalQuiz = null;

      quizzes.forEach(quiz => {
        if (quiz.is_final) {
          currentFinalQuiz = quiz;
        } else if (quiz.video) {
          vidQuizzes[quiz.video] = quiz;
        }
      });

      setVideoQuizzes(vidQuizzes);
      setFinalQuiz(currentFinalQuiz || { ...emptyQuiz, is_final: true, course: courseId });
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      setVideoQuizzes({});
      setFinalQuiz({ ...emptyQuiz, is_final: true, course: courseId });
    }
  };

  // Dialog Handlers
  const handleOpenDialog = async (course = null) => {
    setError(null);
    if (course) {
      setSelectedVideo(null);
      setVideoFormData({
        title: "",
        description: "",
        video_files: [],
        pdf_file: null,
        order: 1
      });
      setEditCourse(course);
      setFormData({
        title: course.title || "",
        description: course.description || "",
        category: Array.isArray(course.category)
          ? course.category.map(c => String(c.id || c))
          : course.category
            ? (course.category.id
              ? [String(course.category.id)]
              : typeof course.category === "number"
                ? [String(course.category)]
                : [])
            : [],
        is_active: course.is_active ?? true,
        cover_image: null,
        certificate_template: null,
        staff_signature_text: "",
      });
      setEnableQuizzes(typeof course.enable_quizzes === 'boolean' ? course.enable_quizzes : true);
      await fetchCourseVideos(course.id);
      await fetchVideoQuizzes(course.id);
    } else {
      setEditCourse(null);
      setFormData({
        title: "",
        description: "",
        category: [],
        is_active: true,
        cover_image: null,
        certificate_template: null,
        staff_signature_text: "",
      });
      setEnableQuizzes(true);
      setVideos([]);
      setVideoQuizzes({});
      setFinalQuiz(null);
    }
    setOpenDialog(true);
    setSelectedTab(0);
  };

  const handleCloseDialog = () => {
    if (saving) return;

    setOpenDialog(false);
    setEditCourse(null);
    setSelectedVideo(null);
    setFormData({
      title: "",
      description: "",
      category: [],
      is_active: true,
      cover_image: null,
      certificate_template: null,
      staff_signature_text: "",
    });
    setVideoFormData({
      title: "",
      description: "",
      video_files: [],
      order: 1
    });
    setVideoQuizzes({});
    setFinalQuiz(null);
    setError(null);
  };

// Course Handlers
const handleSubmit = async (e) => {
  e.preventDefault();
  if (saving) return;

  if (!formData.title.trim()) {
    setError("Title is required");
    return;
  }
  if (!formData.category.length) {
    setError("At least one category is required");
    return;
  }

  setSaving(true);
  setError(null);
  try {
    const isEditing = !!editCourse;

    const submissionData = new FormData();
    submissionData.append("title", formData.title);
    submissionData.append("description", formData.description || "");
    submissionData.append("is_active", formData.is_active);
    submissionData.append("enable_quizzes", enableQuizzes);

    // Append each selected category
    formData.category.forEach((id) => {
      submissionData.append("category", id);
    });

    // ✅ Append certificate file if exists
    if (formData.certificate_file) {
      submissionData.append("certificate", formData.certificate_file);
    }

    // ✅ Append cover image if exists
    if (formData.cover_image) {
      submissionData.append("cover_image", formData.cover_image);
    }

    let response;
    if (isEditing) {
      response = await api.put(
        `/courses/${editCourse.id}/`,
        submissionData
        // Don't set Content-Type header - axios handles it automatically for FormData
      );
      setEditCourse(response.data);
    } else {
      response = await api.post(
        "/courses/",
        submissionData
        // Don't set Content-Type header - axios handles it automatically for FormData
      );
      setEditCourse(response.data);
    }

    await fetchCourses();

    // Upload certificate template if provided
    const savedCourseId = response.data.id;
    let hasTemplateForCourse = false;
    if (formData.certificate_template) {
      try {
        const tmplForm = new FormData();
        tmplForm.append('course_id', savedCourseId);
        tmplForm.append('template', formData.certificate_template);
        await api.post('upload_certificate_template/', tmplForm);
        hasTemplateForCourse = true;
      } catch (tmplErr) {
        const d = tmplErr?.response?.data || {};
        const missing = Array.isArray(d.missing_placeholders) && d.missing_placeholders.length
          ? `Certificate template missing placeholders: ${d.missing_placeholders.join(', ')}`
          : d.error || 'Certificate template upload failed.';
        showSnackbar(missing, 'warning');
      }
    }

    if (!hasTemplateForCourse) {
      try {
        const templateStatusResponse = await api.get('certificate-template/courses/');
        const courseRows = Array.isArray(templateStatusResponse?.data?.courses)
          ? templateStatusResponse.data.courses
          : [];
        const matchedCourse = courseRows.find(
          (row) => Number(row?.course_id) === Number(savedCourseId)
        );
        hasTemplateForCourse = Boolean(matchedCourse?.has_template);
      } catch (templateStatusError) {
        // Keep the flow non-blocking if status lookup fails.
        hasTemplateForCourse = false;
      }
    }

    // Save staff signature text if provided
    if (formData.staff_signature_text.trim()) {
      if (!hasTemplateForCourse) {
        showSnackbar('Upload a certificate template first to save staff signature text.', 'info');
      } else {
        try {
          await api.post('certificate-template/save-settings/', {
            course_id: savedCourseId,
            staff_signature_text: formData.staff_signature_text.trim(),
          });
        } catch (sigErr) {
          showSnackbar('Staff signature save failed.', 'warning');
        }
      }
    }

    if (!isEditing) {
      setSelectedTab(1); // switch to videos tab
    } else {
      handleCloseDialog();
    }
  } catch (error) {
    console.error("Error saving course:", error);
    setError("Failed to save course. Please try again.");
  } finally {
    setSaving(false);
  }
};

// Video Handlers
const handleVideoSubmit = async (e) => {
  e.preventDefault();
  if (saving) return;

  if (!videoFormData.title) {
    setError("Please provide a title.");
    return;
  }

  // Check for either video(s) or PDF
  const hasVideo = videoFormData.video_files?.length > 0;
  const hasPDF = !!videoFormData.pdf_file;

  if (!hasVideo && !hasPDF) {
    setError("Please upload either a video or a PDF file.");
    return;
  }

  if (hasVideo && hasPDF) {
    setError("Please choose either a video or a PDF, not both.");
    return;
  }

  setSaving(true);
  setError(null);
  try {
    if (!editCourse) throw new Error("Please save the course first");

    if (selectedVideo) {
      // UPDATE existing video
      const formDataObj = new FormData();
      formDataObj.append("title", videoFormData.title);
      formDataObj.append("description", videoFormData.description);
      formDataObj.append("order", videoFormData.order);
      formDataObj.append("course", editCourse.id);

      if (hasVideo) {
        formDataObj.append("video_file", videoFormData.video_files[0]);
      }

      if (hasPDF) {
        formDataObj.append("pdf_file", videoFormData.pdf_file);
      }

      await api.put(`/videos/${selectedVideo.id}/`, formDataObj);

    } else {
      // CREATE new video

      if (hasPDF) {
        // Only PDF
        const formDataObj = new FormData();
        formDataObj.append("title", videoFormData.title);
        formDataObj.append("description", videoFormData.description);
        formDataObj.append("order", videos.length + 1);
        formDataObj.append("course", editCourse.id);
        formDataObj.append("pdf_file", videoFormData.pdf_file);

        await api.post("/videos/", formDataObj);

      } else {
        // Only video(s)
        const baseOrder = videos.length + 1;
        for (let i = 0; i < videoFormData.video_files.length; i++) {
          const formDataObj = new FormData();
          const videoTitle =
            videoFormData.video_files.length === 1
              ? videoFormData.title
              : `${videoFormData.title} ${i + 1}`;

          formDataObj.append("title", videoTitle);
          formDataObj.append("description", videoFormData.description);
          formDataObj.append("order", baseOrder + i);
          formDataObj.append("video_file", videoFormData.video_files[i]);
          formDataObj.append("course", editCourse.id);

          await api.post("/videos/", formDataObj);
        }
      }
    }

    const refreshedVideos = await fetchCourseVideos(editCourse.id);
    setSelectedVideo(null);
    setVideoFormData({
      title: "",
      description: "",
      video_files: [],
      pdf_file: null,
      order: (refreshedVideos?.length || 0) + 1,
    });
  } catch (error) {
    console.error("Error saving video or PDF:", error);
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.detail ||
      "Failed to save video or PDF. Please try again.";
    setError(message);
  } finally {
    setSaving(false);
  }
};


  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;

    setSaving(true);
    setError(null);
    try {
      await api.delete(`/videos/${videoId}/`);
      await fetchCourseVideos(editCourse.id);
    } catch (error) {
      console.error("Error deleting video:", error);
      setError("Failed to delete video. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReorderVideo = async (videoIdx, direction) => {
    const newIdx = direction === "up" ? videoIdx - 1 : videoIdx + 1;
    if (videoIdx < 0 || newIdx < 0 || videoIdx >= videos.length || newIdx >= videos.length) return;

    const reorderedVideos = reorderArray(videos, videoIdx, newIdx);
    setVideos(reorderedVideos);

    setSaving(true);
    setError(null);
    try {
      for (const video of reorderedVideos) {
        await api.patch(`/videos/${video.id}/`, { order: video.order });
      }
      await fetchCourseVideos(editCourse.id);
    } catch (error) {
      console.error("Error reordering videos:", error);
      setError("Failed to reorder videos. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Quiz Handlers
  const handleOpenQuizDialog = (videoId = null, quiz = null) => {
    setEditingQuiz({
      videoId,
      quiz: quiz ? { ...quiz } : {
        ...emptyQuiz,
        video: videoId,
        is_final: !videoId,
        course: editCourse.id
      }
    });
    setQuizDialogOpen(true);
    setError(null);
  };

  const handleCloseQuizDialog = () => {
    if (saving) return;
    setQuizDialogOpen(false);
    setEditingQuiz(null);
    setError(null);
  };

  const handleDeleteQuiz = async (quizId, isFinal = false, videoId = null) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;

    setSaving(true);
    setError(null);
    try {
      await api.delete(`/quizzes/${quizId}/`);
      if (isFinal) {
        setFinalQuiz({ ...emptyQuiz, is_final: true, course: editCourse.id });
      } else {
        setVideoQuizzes(prev => {
          const updated = { ...prev };
          delete updated[videoId];
          return updated;
        });
      }
    } catch (error) {
      console.error("Error deleting quiz:", error);
      setError("Failed to delete quiz. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuizSave = async () => {
    if (saving) return;

    const { videoId, quiz } = editingQuiz;
    if (!editCourse?.id) {
      setError("Please save the course first");
      return;
    }

    if (!quiz.title.trim()) {
      setError("Quiz title is required");
      return;
    }

    if (!quiz.questions?.length) {
      setError("At least one question is required");
      return;
    }

   
  // Calculate the sum of individual question scores
  const totalQuestionScore = quiz.questions.reduce((sum, question) => sum + (question.score || 0), 0);

  // Validate that the sum of individual question scores matches the total score
  if (totalQuestionScore !== quiz.total_score) {
    setError(`The sum of individual question scores (${totalQuestionScore}) does not match the total score (${quiz.total_score}).`);
    return;
  }


    setSaving(true);
    setError(null);
    try {
      const quizData = {
        ...quiz,
        course: editCourse.id,
        is_final: !videoId,
        video: videoId || null
      };

      let savedQuiz;
      if (quiz.id) {
        const response = await api.put(`/quizzes/${quiz.id}/`, quizData);
        savedQuiz = response.data;
      } else {
        const response = await api.post("/quizzes/", quizData);
        savedQuiz = response.data;
      }

      if (videoId) {
        setVideoQuizzes(prev => ({ ...prev, [videoId]: savedQuiz }));
      } else {
        setFinalQuiz(savedQuiz);
      }

      await fetchVideoQuizzes(editCourse.id);
      handleCloseQuizDialog();
    } catch (error) {
      console.error("Error saving quiz:", error);
      setError("Failed to save quiz. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const distributeScores = (questions, totalScore = 100) => {
  const count = questions.length;
  if (count === 0) return questions;

  // Check if all questions have default or zero score (no manual changes)
  const allDefault = questions.every(q => !q.score || q.score === 0);

  if (!allDefault) return questions; // Don't overwrite manual changes

  if (count === 1) {
    return questions.map(q => ({ ...q, score: totalScore }));
  }

  const baseScore = Math.floor(totalScore / count);
  const remainder = totalScore % count;

  return questions.map((q, idx) => ({
    ...q,
    score: idx === 0 ? baseScore + remainder : baseScore,
  }));
};

  // Question Handlers
  const handleOpenQuestionDialog = (qIdx, question = null) => {
    setEditingQuestion({
      qIdx,
      question: question ? { ...question } : { ...emptyQuestion }
    });
    setQuestionDialogOpen(true);
    setError(null);
  };

  const handleCloseQuestionDialog = () => {
    if (saving) return;
    setQuestionDialogOpen(false);
    setEditingQuestion(null);
    setError(null);
  };

  const handleDeleteQuestion = (qIdx) => {
    const { quiz } = editingQuiz;
    const newQuestions = [...(quiz.questions || [])];
    newQuestions.splice(qIdx, 1);
    const scoredQuestions = distributeScores(newQuestions, editingQuiz.quiz.total_score || 100);

setEditingQuiz({
  ...editingQuiz,
  quiz: { ...quiz, questions: scoredQuestions }
});

  };

 const handleQuestionSave = () => {
  const { qIdx, question } = editingQuestion;

  if (!question.question_text.trim()) {
    setError("Question text is required");
    return;
  }

  if (!question.choices?.length || question.choices.some(c => !c.text.trim())) {
    setError("All choices must have text");
    return;
  }

  if (!question.choices.some(c => c.is_correct)) {
    setError("At least one choice must be marked as correct");
    return;
  }

  const { quiz } = editingQuiz;
  const newQuestions = [...(quiz.questions || [])];

  if (qIdx < newQuestions.length) {
    newQuestions[qIdx] = { ...question };
  } else {
    newQuestions.push({ ...question });
  }

  const totalScore = quiz.total_score || 100;

  // Check if all scores are 0 or not manually edited
  const allDefault = newQuestions.every(q => !q.score || q.score === 0);

  let scoredQuestions = [...newQuestions];

  if (allDefault) {
    const count = scoredQuestions.length;
    if (count === 1) {
      scoredQuestions[0].score = totalScore;
    } else {
      const base = Math.floor(totalScore / count);
      const remainder = totalScore % count;
      scoredQuestions = scoredQuestions.map((q, i) => ({
        ...q,
        score: i === 0 ? base + remainder : base
      }));
    }
  }

  setEditingQuiz({
    ...editingQuiz,
    quiz: {
      ...quiz,
      questions: scoredQuestions
    }
  });

  handleCloseQuestionDialog();
};



  // DataGrid Columns
  const columns = useMemo(
  () => [
    {
      field: "title",
      headerName: "Title",
      flex: 1,
    },
    {
      field: "category",
      headerName: "Categories",
      flex: 1,
      renderCell: (params) => {
        if (Array.isArray(params.row.category)) {
          return params.row.category
            .map(cat =>
              (typeof cat === "object" && cat !== null && cat.name)
                ? cat.name
                : typeof cat === "string"
                  ? cat
                  : ""
            )
            .filter(Boolean)
            .join(", ");
        }
        return params.row.category?.name || "";
      }
    },
    {
      field: "created_on",
      headerName: "Created On",
      flex: 1,
      renderCell: (params) => formatUTCDateTime(params.row.created_on)
    },
    {
      field: "is_active",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => params.row.is_active ? "Active" : "Inactive"
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton
              onClick={() => params?.row?.id && handleOpenDialog(params.row)}
              disabled={!params?.row?.id || saving}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>

          {/* ✅ Request button for STAFF users */}
          {user?.user_type === "STAFF" && (
            <Tooltip title="Request Course Deletion">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  params?.row?.id && handleOpenRequestDialog(params.row);
                }}
                disabled={!params?.row?.id || saving}
              >
                <MarkEmailUnreadIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* ✅ Hide delete for STAFF */}
          {user?.user_type !== "STAFF" && (
            <Tooltip title="Delete">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  params?.row?.id && handleDelete(params.row.id);
                }}
                disabled={!params?.row?.id || saving}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [saving, user]
);

  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const normalizedCategory = categoryFilter.trim().toLowerCase();

    return courses.filter((course) => {
      if (!course) return false;

      const title = String(course.title || "").toLowerCase();
      const categoryNames = getCourseCategoryNames(course).map((name) => name.toLowerCase());
      const isActive = Boolean(course.is_active);

      const matchesSearch = !normalizedSearch || title.includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && isActive) ||
        (statusFilter === "INACTIVE" && !isActive);
      const matchesCategory =
        categoryFilter === "ALL" ||
        categoryNames.some((name) => name === normalizedCategory);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [courses, searchTerm, statusFilter, categoryFilter]);

  const availableCategoryOptions = useMemo(() => {
    const names = categories
      .map((cat) => String(cat?.name || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return ["ALL", ...Array.from(new Set(names))];
  }, [categories]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course? This will soft delete the course. Go to Approved Actions to permanently delete.")) return;

    setSaving(true);
    setError(null);
    try {
      // Always use soft delete
      await api.delete(`/courses/${id}/`);
      showSnackbar("Course soft deleted successfully. Go to Approved Actions to permanently delete.", "success");
      await fetchCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      setError("Failed to delete course. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Request dialog handlers
  const handleOpenRequestDialog = (row) => {
    setSelectedItem(row);
    setRequestMessage('');
    setOpenRequestDialog(true);
  };

  const handleCloseRequestDialog = () => {
    setOpenRequestDialog(false);
    setSelectedItem(null);
    setRequestMessage('');
  };

  const handleSubmitRequest = async () => {
    try {
      await api.post('/requests/', {
        request_type: 'DELETE_COURSE',
        object_id: selectedItem.id,
        object_title: selectedItem.title,
        message: requestMessage
      });
      showSnackbar('Delete request submitted successfully', 'success');
      handleCloseRequestDialog();
    } catch (error) {
      console.error('Error submitting request:', error);
      showSnackbar('Failed to submit delete request', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Header Section */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          bgcolor: 'primary.50',
          border: '1px solid',
          borderColor: 'primary.100'
        }}
      >
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography
                variant="h4"
                fontWeight="bold"
                color="primary.main"
                gutterBottom
              >
                Course Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Details
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              disabled={saving}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                px: 3,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'medium'
              }}
            >
              Add Course
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Paper
        elevation={0}
        sx={{
          height: 550,
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr auto' },
            gap: 2,
            alignItems: 'center',
            bgcolor: 'background.paper'
          }}
        >
          <TextField
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by course title"
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="course-status-filter-label">Status</InputLabel>
            <Select
              labelId="course-status-filter-label"
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel id="course-category-filter-label">Category</InputLabel>
            <Select
              labelId="course-category-filter-label"
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {availableCategoryOptions.map((categoryName) => (
                <MenuItem key={categoryName} value={categoryName}>
                  {categoryName === 'ALL' ? 'All' : categoryName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleResetFilters}>
            Clear
          </Button>
        </Box>
        <DataGridErrorBoundary>
          <DataGrid
            rows={filteredCourses}
            columns={columns}
            pageSize={DEFAULT_PAGE_SIZE}
            rowsPerPageOptions={[DEFAULT_PAGE_SIZE]}
            disableSelectionOnClick
            loading={loading}
            getRowId={(row) => row?.id || Math.random()}
            autoHeight={false}
            components={{
              NoRowsOverlay: () => (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <Typography>No courses available</Typography>
                </Box>
              ),
              LoadingOverlay: () => (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <CircularProgress />
                </Box>
              ),
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'grey.50',
                fontSize: '0.875rem',
                fontWeight: 'medium'
              },
              '& .MuiDataGrid-row': {
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              },
              '& .MuiDataGrid-cell': {
                border: 'none',
                py: 1
              }
            }}
          />
        </DataGridErrorBoundary>
      </Paper>

      {/* Course Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={saving}
      >
        <DialogTitle>
          {editCourse ? "Edit Course" : "Add New Course"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Tabs
            value={editCourse ? selectedTab : 0}
            onChange={(e, v) => setSelectedTab(v)}
          >
            <Tab label="Course Details" />
            {editCourse && <Tab label="Videos" />}
            {editCourse && <Tab label="Final Quiz" />}
            {/* {editCourse && <Tab label="Certificate" />} */}
          </Tabs>

          {/* Course Details Tab */}
         {(!editCourse || selectedTab === 0) && (
   <Box component="form" noValidate sx={{ mt: 2 }}>

    {/* Category Autocomplete - FIRST */}
    <Autocomplete
      multiple
      id="category-autocomplete"
      options={categories}
      getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
      value={categories.filter(cat => formData.category.includes(String(cat.id)))}
      onChange={(event, newValue) => {
        const categoryIds = newValue.map(cat => String(cat.id));
        setFormData({ ...formData, category: categoryIds });
      }}
      isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
      filterSelectedOptions
      disableCloseOnSelect
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          label="Categories"
          placeholder="Select or type categories"
          margin="normal"
          required
        />
      )}
      disabled={saving}
    />

    {/* Add Category Field */}
    <Box display="flex" alignItems="center" mt={1}>
      <TextField
        label="New Category"
        variant="outlined"
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        onFocus={() => setIsCategoryInputFocused(true)}
        size="small"
        fullWidth
        error={!!categoryError}
        helperText={categoryError}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleAddCategory}
        sx={{ ml: 2, height: '40px' }}
        disabled={saving || !newCategoryName}
      >
        Add
      </Button>
    </Box>

    {/* Delete Category Dropdown */}
    {isCategoryInputFocused && (
      <FormControl fullWidth size="small" sx={{ mt: 2 }}>
        <InputLabel>Delete Category</InputLabel>
        <Select
          value={deleteCategoryId}
          label="Delete Category"
          onChange={async (e) => {
            const categoryId = e.target.value;
            const confirmed = window.confirm('Are you sure you want to delete this category?');
            if (!confirmed) return;

            try {
              await api.delete(`/categories/${categoryId}/`);
              showSnackbar('Category deleted successfully');
              fetchCategories();
            } catch (err) {
              console.error(err);
              showSnackbar('Failed to delete category', 'error');
            } finally {
              setDeleteCategoryId('');
            }
          }}
        >
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )}

    {/* Title Field */}
    <TextField
      margin="normal"
      required
      fullWidth
      label="Title"
      value={formData.title}
      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      disabled={saving}
    />

    {/* Cover Image Upload Field */}
    <Box sx={{ mt: 2, mb: 1 }}>
      <Typography variant="subtitle1" gutterBottom>
        Course Cover Image
      </Typography>
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="cover-image-upload"
        type="file"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            setFormData({ ...formData, cover_image: file });
          }
        }}
        disabled={saving}
      />
      <label htmlFor="cover-image-upload">
        <Button
          variant="outlined"
          component="span"
          startIcon={<UploadIcon />}
          disabled={saving}
          sx={{ mb: 2 }}
        >
          {formData.cover_image ? 'Change Cover Image' : 'Upload Cover Image'}
        </Button>
      </label>
     
      {/* Show existing cover image if editing */}
      {editCourse && editCourse.cover_image && !formData.cover_image && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="textSecondary">
            Current cover image:
          </Typography>
          <Box sx={{ mt: 1, maxWidth: 200 }}>
            <img
              src={editCourse.cover_image}
              alt="Current cover"
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: 8,
                border: '1px solid #ddd'
              }}
            />
          </Box>
        </Box>
      )}
     
      {/* Show new cover image preview */}
      {formData.cover_image && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="textSecondary">
            New cover image: {formData.cover_image.name}
          </Typography>
          <Box sx={{ mt: 1, maxWidth: 200 }}>
            <img
              src={URL.createObjectURL(formData.cover_image)}
              alt="Cover preview"
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: 8,
                border: '1px solid #ddd'
              }}
            />
          </Box>
        </Box>
      )}
    </Box>

    {/* Description Field */}
    <TextField
      margin="normal"
      fullWidth
      label="Description"
      multiline
      rows={4}
      value={formData.description}
      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      disabled={saving}
    />

    {/* Status Field */}
    <FormControl fullWidth margin="normal">
      <InputLabel>Status</InputLabel>
      <Select
        value={formData.is_active}
        label="Status"
        onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
        disabled={saving}
      >
        <MenuItem value={true}>Active</MenuItem>
        <MenuItem value={false}>Inactive</MenuItem>
      </Select>
    </FormControl>

    {/* Certificate Template Upload */}
    <Box sx={{ mt: 2, mb: 1 }}>
      <Typography variant="subtitle1" gutterBottom>
        Certificate Template (.docx)
      </Typography>
      <input
        accept=".docx"
        style={{ display: 'none' }}
        id="cert-template-upload"
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          setFormData((prev) => ({ ...prev, certificate_template: file }));
          e.target.value = '';
        }}
        disabled={saving}
      />
      <label htmlFor="cert-template-upload">
        <Button variant="outlined" component="span" startIcon={<UploadIcon />} disabled={saving}>
          {formData.certificate_template ? formData.certificate_template.name : 'Upload Certificate Template'}
        </Button>
      </label>
      {formData.certificate_template && (
        <Button size="small" color="error" sx={{ ml: 1 }} onClick={() => setFormData((prev) => ({ ...prev, certificate_template: null }))} disabled={saving}>
          Clear
        </Button>
      )}
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
        Must contain placeholders: [Recipient Name], [Course Name], [Completion Date], [Certificate ID]
      </Typography>
    </Box>

    {/* Staff Signature Text */}
    <TextField
      margin="normal"
      fullWidth
      label="Staff Signature Text"
      placeholder="e.g. John Smith, Training Manager"
      value={formData.staff_signature_text}
      onChange={(e) => setFormData((prev) => ({ ...prev, staff_signature_text: e.target.value }))}
      disabled={saving}
      helperText="This signature will appear on the student's certificate upon course completion."
    />

  </Box>
)}

          {/* Videos Tab */}
          {selectedTab === 1 && editCourse && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Course Videos</Typography>
              {videos.length === 0 ? (
                <Alert severity="info">No videos added yet</Alert>
              ) : (
                <List>
                  {videos.map((video, idx) => (
                    <ListItem key={video.id} divider>
                      <ListItemText
                        secondaryTypographyProps={{ component: "div" }}
                        primary={
                          <Box display="flex" alignItems="center">
                            <Typography variant="subtitle1">
                              {video.title}
                            </Typography>
                            <Chip
                              label={videoQuizzes[video.id] ? "Has Quiz" : "No Quiz"}
                              color={videoQuizzes[video.id] ? "success" : "default"}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" component="span" display="block">
                              Order: {video.order}
                            </Typography>
                            <Typography variant="body2" component="span" display="block">
                              Duration: {video.duration} seconds
                            </Typography>
                            {video.description && (
                              <Typography variant="body2" component="span" display="block">
                                {video.description}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <Box>
                        <Tooltip title="Move Up">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleReorderVideo(idx, "up")}
                              disabled={idx === 0 || saving}
                            >
                              <ArrowUpward />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Move Down">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleReorderVideo(idx, "down")}
                              disabled={idx === videos.length - 1 || saving}
                            >
                              <ArrowDownward />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {enableQuizzes && (
                        <Tooltip title={videoQuizzes[video.id] ? "Edit Quiz" : "Add Quiz"}>
                          <IconButton
                            onClick={() => handleOpenQuizDialog(video.id, videoQuizzes[video.id])}
                            disabled={saving}
                          >
                            <QuizIcon />
                          </IconButton>
                        </Tooltip>
                        )}
                        <Tooltip title="Edit Video">
                          <IconButton
                            onClick={() => {
                              setSelectedVideo(video);
                              setVideoFormData({
                                title: video.title,
                                description: video.description || "",
                                video_files: [],
                                order: video.order
                              });
                            }}
                            disabled={saving}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Video">
                          <IconButton
                            onClick={() => handleDeleteVideo(video.id)}
                            disabled={saving}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}

              {/* Video Form */}
              <Box component="form" noValidate sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {selectedVideo ? "Edit Video" : "Add New Video"}
                </Typography>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Title"
                  value={videoFormData.title}
                  onChange={(e) => setVideoFormData({
                    ...videoFormData,
                    title: e.target.value
                  })}
                  disabled={saving}
                />
                <TextField
                  margin="normal"
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={videoFormData.description}
                  onChange={(e) => setVideoFormData({
                    ...videoFormData,
                    description: e.target.value
                  })}
                  disabled={saving}
                />
                <TextField
                  margin="normal"
                  required
                  type="number"
                  label="Order"
                  value={videoFormData.order}
                  onChange={(e) => setVideoFormData({
                    ...videoFormData,
                    order: parseInt(e.target.value) || 1
                  })}
                  disabled={saving}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={enableQuizzes}
                      onChange={() => setEnableQuizzes(prev => !prev)}
                      disabled={saving}
                    />
                  }
                  label="Enable"
                  sx={{ mt: 3 }}
                />

{/* Upload Buttons */}
<Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
  {/* Video upload */}
  {!videoFormData.pdf_file && (
    <label htmlFor="video-file">
      <input
        id="video-file"
        type="file"
        accept="video/*"
        multiple={!selectedVideo}
        hidden
        disabled={saving}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          setVideoFormData({
            ...videoFormData,
            video_files: files,
            pdf_file: null, // Clear PDF if video selected
          });
        }}
      />
      <Button
        variant="outlined"
        component="span"
        startIcon={<UploadIcon />}
        disabled={saving}
      >
        {videoFormData.video_files.length
          ? `${videoFormData.video_files.length} file(s) selected`
          : "Upload Video"}
      </Button>
    </label>
  )}

  {/* PDF upload */}
  {!videoFormData.video_files.length && (
    <label htmlFor="pdf-file">
      <input
        id="pdf-file"
        type="file"
        accept="application/pdf"
        hidden
        disabled={saving}
        onChange={(e) => {
          const file = e.target.files?.[0];
          setVideoFormData({
            ...videoFormData,
            pdf_file: file,
            video_files: [], // Clear videos if PDF selected
          });
        }}
      />
      <Button
        variant="outlined"
        component="span"
        startIcon={<UploadIcon />}
        disabled={saving}
      >
        {videoFormData.pdf_file
          ? videoFormData.pdf_file.name
          : "Upload Lecture Slides (PDF)"}
      </Button>
    </label>
  )}
</Box>

{/* File Previews */}
{videoFormData.video_files.length > 0 && (
  <Box sx={{ mt: 1 }}>
    <Typography variant="caption">Selected videos:</Typography>
    {videoFormData.video_files.map((file, i) => (
      <Typography key={i} variant="caption" sx={{ ml: 1 }} display="block">
        {file.name}
      </Typography>
    ))}
  </Box>
)}

{videoFormData.pdf_file && (
  <Box sx={{ mt: 1 }}>
    <Typography variant="caption">
      Selected PDF: {videoFormData.pdf_file.name}
    </Typography>
  </Box>
)}

{/* Clear Button */}
{(videoFormData.video_files.length > 0 || videoFormData.pdf_file) && (
  <Box sx={{ mt: 1 }}>
    <Button
      color="error"
      variant="text"
      onClick={() => {
        setVideoFormData({
          ...videoFormData,
          video_files: [],
          pdf_file: null,
        });
      }}
      disabled={saving}
    >
      Clear File Selection
    </Button>
  </Box>
)}

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleVideoSubmit}
                    disabled={
                      saving ||
                      !videoFormData.title ||
                      (!selectedVideo &&
                        !videoFormData.video_files.length &&
                        !videoFormData.pdf_file)
                    }
                    startIcon={saving ? <CircularProgress size={20} /> : null}
                  >
                    {selectedVideo ? "Update Video" : "Add Video"}
                  </Button>

                  {selectedVideo && (
                    <Button
                      sx={{ ml: 1 }}
                      onClick={() => {
                        setSelectedVideo(null);
                        setVideoFormData({
                          title: "",
                          description: "",
                          video_files: [],
                          order: videos.length + 1
                        });
                      }}
                      disabled={saving}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          {/* Final Quiz Tab */}
          {selectedTab === 2 && editCourse && enableQuizzes && (
            <Box sx={{ mt: 2 }}>
    <Typography variant="h6" gutterBottom>Final Course Quiz</Typography>
    {finalQuiz?.id ? (
      <Box>
        <Typography variant="subtitle1">{finalQuiz.title}</Typography>
        <Typography variant="body2">{finalQuiz.description}</Typography>
        <Typography variant="body2">
          Passing Score: {finalQuiz.passing_score}%
        </Typography>


        <Typography variant="body2">
          Questions: {finalQuiz.questions?.length || 0}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => handleOpenQuizDialog(null, finalQuiz)}
            disabled={saving}
          >
            Edit Quiz
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ ml: 1 }}
            onClick={() => handleDeleteQuiz(finalQuiz.id, true)}
            disabled={saving}
          >
            Delete Quiz
          </Button>
        </Box>
      </Box>
    ) : (
      <Button
        variant="outlined"
        startIcon={<QuizIcon />}
        onClick={() => handleOpenQuizDialog(null)}
        disabled={saving}
      >
        Add Final Quiz
      </Button>
    )}
  </Box>
)}

{/* Certificate Tab */}
{selectedTab === 3 && editCourse && (
            <Box sx={{ mt: 2 }}>
    <Typography variant="h6" gutterBottom>
      Upload Certificate (PDF)
    </Typography>
    <input
      accept="application/pdf"
      style={{ display: "none" }}
      id="certificate-file-tab"
      type="file"
      onChange={(e) => {
        const file = e.target.files?.[0] || null;
        setFormData((prev) => ({
          ...prev,
          certificate_file: file,
        }));
      }}
      disabled={saving}
    />
    <label htmlFor="certificate-file-tab">
      <Button
        variant="outlined"
        component="span"
        startIcon={<UploadIcon />}
        sx={{ mt: 1 }}
        disabled={saving}
      >
        {formData.certificate_file
          ? formData.certificate_file.name
          : "Upload Certificate PDF"}
      </Button>
    </label>
  </Box>
)}


        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          {(!editCourse || selectedTab === 0) && (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving || !formData.title || !formData.category.length}
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {editCourse ? "Save Changes" : "Create Course"}
            </Button>
          )}
           
           {editCourse && selectedTab === 1 && (
        <Button
               variant="contained"
               onClick={handleSubmit}
                disabled={saving}
               startIcon={saving ? <CircularProgress size={20} /> : null}
    >
                 Save Changes
         </Button>
  )}

                {/* Save button for Final Quiz tab */}
               {editCourse && selectedTab === 2 && (
           <Button
                  variant="contained"
                 onClick={handleSubmit}
                 disabled={saving}
                 startIcon={saving ? <CircularProgress size={20} /> : null}
    >
                 Save Changes
           </Button>
       )}

      {editCourse && selectedTab === 3 && (
  <Button
    variant="contained"
    onClick={handleSubmit}
    disabled={saving}
    startIcon={saving ? <CircularProgress size={20} /> : null}
  >
    Save Changes
  </Button>
)}

          </DialogActions>

            </Dialog>

      {/* Quiz Dialog */}
      <Dialog
        open={quizDialogOpen}
        onClose={handleCloseQuizDialog}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={saving}
      >
        <DialogTitle>
          {editingQuiz?.quiz?.id ? "Edit Quiz" : "Add Quiz"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            label="Quiz Title"
            value={editingQuiz?.quiz?.title || ""}
            onChange={(e) => setEditingQuiz({
              ...editingQuiz,
              quiz: { ...editingQuiz.quiz, title: e.target.value }
            })}
            disabled={saving}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={editingQuiz?.quiz?.description || ""}
            onChange={(e) => setEditingQuiz({
              ...editingQuiz,
              quiz: { ...editingQuiz.quiz, description: e.target.value }
            })}
            disabled={saving}
          />
          <TextField
            margin="normal"
            required
            type="number"
            label="Passing Score (%)"
            value={editingQuiz?.quiz?.passing_score || 70}
            onChange={(e) => setEditingQuiz({
              ...editingQuiz,
              quiz: {
                ...editingQuiz.quiz,
                passing_score: Math.max(0, Math.min(100, parseInt(e.target.value) || 70))
              }
            })}
            inputProps={{ min: 0, max: 100 }}
            disabled={saving}
          />
<TextField
  margin="normal"
  required
  type="number"
  label="Total Score"
  value={editingQuiz?.quiz?.total_score || 100}
  onChange={(e) => {
  let val = parseInt(e.target.value);
  if (isNaN(val)) val = 100;
  val = Math.min(100, Math.max(0, val)); // Clamp between 0 and 100

  setEditingQuiz((prev) => {
    // Adjust passing score if necessary
    const passingScore = prev.quiz.passing_score > val ? val : prev.quiz.passing_score;

    return {
      ...prev,
      quiz: {
        ...prev.quiz,
        total_score: val,
        passing_score: passingScore,
      }
    };
  });
}}
  inputProps={{ min: 0 }}
  disabled={saving}
/>


          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Questions
            <Typography variant="caption" sx={{ ml: 1 }}>
              ({editingQuiz?.quiz?.questions?.length || 0})
            </Typography>
          </Typography>

          <List>
            {(editingQuiz?.quiz?.questions || []).map((question, idx) => (
              <ListItem key={idx} divider>
                <ListItemText
                  primary={question.question_text}
                  secondaryTypographyProps={{ component: "div" }}
                  secondary={
                    <>
                      <Typography variant="body2" component="span" display="block">
                        Choices: {question.choices.length}
                      </Typography>
                      <Typography variant="body2" component="span" display="block" color="primary">
                        Correct: {
                          question.choices.find(c => c.is_correct)?.text ||
                          "No correct answer selected"
                        }
                      </Typography>
                    </>
                  }
                />
                <Button
                  size="small"
                  onClick={() => handleOpenQuestionDialog(idx, question)}
                  disabled={saving}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDeleteQuestion(idx)}
                  disabled={saving}
                >
                  Delete
                </Button>
              </ListItem>
            ))}
          </List>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenQuestionDialog(editingQuiz?.quiz?.questions?.length || 0)}
            sx={{ mt: 2 }}
            disabled={saving}
          >
            Add Question
          </Button>

          <Typography variant="caption" color="textSecondary" sx={{ ml: 2, mt: 1 }}>
            Total Assigned Score: {
              (editingQuiz?.quiz?.questions || []).reduce((sum, q) => sum + (q.score || 0), 0)
            } / {editingQuiz?.quiz?.total_score || 100}
          </Typography>
         
        </DialogContent>
        <DialogActions>
          {editingQuiz?.quiz?.id && (
    <Button
      color="error"
      onClick={() => handleDeleteQuiz(editingQuiz.quiz.id, editingQuiz.quiz.is_final, editingQuiz.quiz.video)}
      disabled={saving}
    >
      Delete
    </Button>
  )}
          <Button onClick={handleCloseQuizDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleQuizSave}
            disabled={
              saving ||
              !editingQuiz?.quiz?.title ||
              !editingQuiz?.quiz?.questions?.length ||
              editingQuiz.quiz.questions.some(q =>
                !q.question_text ||
                !q.choices?.length ||
                !q.choices.some(c => c.is_correct)
              )
            }
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            Save Quiz
          </Button>
        </DialogActions>
      </Dialog>

      {/* Question Dialog */}
      <Dialog
        open={questionDialogOpen}
        onClose={handleCloseQuestionDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={saving}
      >
        <DialogTitle>
          {editingQuestion?.question?.id ? "Edit Question" : "Add Question"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            label="Question Text"
            multiline
            rows={2}
            value={editingQuestion?.question?.question_text || ""}
            onChange={(e) => setEditingQuestion({
              ...editingQuestion,
              question: {
                ...editingQuestion.question,
                question_text: e.target.value
              }
            })}
            disabled={saving}
          />
          <TextField
      margin="normal"
      required
      type="number"
      label="Score"
      value={editingQuestion?.question?.score || 10}
      onChange={(e) => setEditingQuestion({
        ...editingQuestion,
        question: {
          ...editingQuestion.question,
          score: Math.max(0, parseInt(e.target.value) || 10)
        }
      })}
      inputProps={{ min: 0 }}
      disabled={saving}
    />

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Answer Choices
            <Typography variant="caption" sx={{ ml: 1 }}>
              (at least one must be marked as correct)
            </Typography>
          </Typography>

          {(editingQuestion?.question?.choices || []).map((choice, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                mb: 1
              }}
            >
              <TextField
                required
                fullWidth
                label={`Choice ${idx + 1}`}
                value={choice.text}
                onChange={(e) => {
                  const newChoices = [...editingQuestion.question.choices];
                  newChoices[idx] = {
                    ...newChoices[idx],
                    text: e.target.value
                  };
                  setEditingQuestion({
                    ...editingQuestion,
                    question: {
                      ...editingQuestion.question,
                      choices: newChoices
                    }
                  });
                }}
                disabled={saving}
              />
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Correct?</InputLabel>
                <Select
                  value={choice.is_correct ? "yes" : "no"}
                  label="Correct?"
                  onChange={(e) => {
                    const newChoices = [...editingQuestion.question.choices];
                    if (e.target.value === "yes") {
                      newChoices.forEach(c => c.is_correct = false);
                    }
                    newChoices[idx] = {
                      ...newChoices[idx],
                      is_correct: e.target.value === "yes"
                    };
                    setEditingQuestion({
                      ...editingQuestion,
                      question: {
                        ...editingQuestion.question,
                        choices: newChoices
                      }
                    });
                  }}
                  disabled={saving}
                >
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
              <IconButton
                color="error"
                onClick={() => {
                  const newChoices = editingQuestion.question.choices.filter(
                    (_, cidx) => cidx !== idx
                  );
                  setEditingQuestion({
                    ...editingQuestion,
                    question: {
                      ...editingQuestion.question,
                      choices: newChoices
                    }
                  });
                }}
                disabled={saving}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              const newChoices = [
                ...(editingQuestion?.question?.choices || []),
                { text: "", is_correct: false }
              ];
              setEditingQuestion({
                ...editingQuestion,
                question: {
                  ...editingQuestion.question,
                  choices: newChoices
                }
              });
            }}
            sx={{ mt: 1 }}
            disabled={saving}
          >
            Add Choice
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuestionDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleQuestionSave}
            disabled={
              saving ||
              !editingQuestion?.question?.question_text ||
              !editingQuestion?.question?.choices?.length ||
              !editingQuestion?.question?.choices?.some(c => c.is_correct) ||
              editingQuestion?.question?.choices?.some(c => !c.text)
            }
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            Save Question
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Request Dialog */}
      <Dialog open={openRequestDialog} onClose={handleCloseRequestDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Request to Delete Course</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body1" gutterBottom>
              Requesting deletion for: <strong>{selectedItem?.title}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              This will send a delete request to the admin. The course will only be deleted after admin approval.
            </Typography>
            <TextField
              margin="normal"
              fullWidth
              label="Reason for Deletion (Optional)"
              multiline
              rows={4}
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Please provide a reason for requesting deletion of this course..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRequestDialog}>Cancel</Button>
          <Button onClick={handleSubmitRequest} variant="contained" color="error">
            Submit Delete Request
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default CourseManagement;

