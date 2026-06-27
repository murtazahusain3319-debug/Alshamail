import { B } from "@/lib/brand";
import { Printer } from "lucide-react";

interface LessonData {
  id: number;
  title: string;
  status: "completed" | "in-progress" | "not-started";
  score?: number;
  dateCompleted?: string;
}

interface StudentProgressReportProps {
  studentName: string;
  studentId: string;
  courseName: string;
  reportDate: string;
  lessons: LessonData[];
}

export function StudentProgressReport({
  studentName,
  studentId,
  courseName,
  reportDate,
  lessons,
}: StudentProgressReportProps) {
  const completedLessons = lessons.filter(l => l.status === "completed");
  const totalLessons = lessons.length;
  const averageScore = completedLessons.length > 0
    ? Math.round(completedLessons.reduce((sum, l) => sum + (l.score || 0), 0) / completedLessons.length)
    : 0;
  const overallProgress = Math.round((completedLessons.length / totalLessons) * 100);

  const handlePrint = () => {
    const printContent = document.getElementById("student-progress-report");
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    const printContents = printContent.innerHTML;

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return B.success;
      case "in-progress": return "#f59e0b";
      case "not-started": return B.muted;
      default: return B.muted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "in-progress": return "In Progress";
      case "not-started": return "Not Started";
      default: return status;
    }
  };

  return (
    <>
      {/* Print Button */}
      <button
        onClick={handlePrint}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: B.navy,
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "12px 20px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1000,
        }}
      >
        <Printer size={16} />
        Print Report
      </button>

      {/* Report Content */}
      <div
        id="student-progress-report"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#1f2937",
          lineHeight: 1.6,
          padding: "40px",
          maxWidth: "800px",
          margin: "0 auto",
          background: "#fff",
        }}>
      {/* Header */}
      <div style={{
        textAlign: "center",
        marginBottom: "40px",
        paddingBottom: "20px",
        borderBottom: `3px solid ${B.navy}`,
      }}>
        <img
          src="/logo-full.jpeg"
          alt="Al-Shamail Logo"
          style={{
            height: "60px",
            marginBottom: "16px",
          }}
        />
        <h1 style={{
          fontSize: "28px",
          fontWeight: 700,
          color: B.navy,
          margin: "0 0 8px 0",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}>
          Student Progress Report
        </h1>
        <p style={{
          fontSize: "14px",
          color: B.muted,
          margin: 0,
        }}>
          Official Academic Record
        </p>
      </div>

      {/* Student Information */}
      <div style={{
        background: "#f8fafc",
        padding: "24px",
        borderRadius: "8px",
        marginBottom: "32px",
        border: `1px solid ${B.light}`,
      }}>
        <h2 style={{
          fontSize: "16px",
          fontWeight: 600,
          color: B.navy,
          margin: "0 0 16px 0",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>
          Student Information
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
        }}>
          <div>
            <div style={{
              fontSize: "12px",
              color: B.muted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}>
              Student Name
            </div>
            <div style={{
              fontSize: "15px",
              fontWeight: 500,
              color: "#1f2937",
            }}>
              {studentName}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: "12px",
              color: B.muted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}>
              Student ID
            </div>
            <div style={{
              fontSize: "15px",
              fontWeight: 500,
              color: "#1f2937",
            }}>
              {studentId}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: "12px",
              color: B.muted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}>
              Course
            </div>
            <div style={{
              fontSize: "15px",
              fontWeight: 500,
              color: "#1f2937",
            }}>
              {courseName}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: "12px",
              color: B.muted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}>
              Report Date
            </div>
            <div style={{
              fontSize: "15px",
              fontWeight: 500,
              color: "#1f2937",
            }}>
              {reportDate}
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Progress Table */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{
          fontSize: "16px",
          fontWeight: 600,
          color: B.navy,
          margin: "0 0 16px 0",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>
          Lesson Progress
        </h2>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
        }}>
          <thead>
            <tr style={{
              background: B.navy,
              color: "#fff",
            }}>
              <th style={{
                padding: "12px 16px",
                textAlign: "left",
                fontWeight: 600,
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                Lesson Name
              </th>
              <th style={{
                padding: "12px 16px",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                Status
              </th>
              <th style={{
                padding: "12px 16px",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                Score
              </th>
              <th style={{
                padding: "12px 16px",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                Date Completed
              </th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson, index) => (
              <tr key={lesson.id} style={{
                borderBottom: `1px solid ${B.light}`,
                background: index % 2 === 0 ? "#fff" : "#f8fafc",
              }}>
                <td style={{
                  padding: "14px 16px",
                  fontWeight: 500,
                  color: "#1f2937",
                }}>
                  {lesson.title}
                </td>
                <td style={{
                  padding: "14px 16px",
                  textAlign: "center",
                }}>
                  <span style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    background: getStatusColor(lesson.status) + "20",
                    color: getStatusColor(lesson.status),
                  }}>
                    {getStatusText(lesson.status)}
                  </span>
                </td>
                <td style={{
                  padding: "14px 16px",
                  textAlign: "center",
                  fontWeight: 600,
                  color: lesson.score ? B.navy : B.muted,
                }}>
                  {lesson.score ? `${lesson.score}%` : "-"}
                </td>
                <td style={{
                  padding: "14px 16px",
                  textAlign: "center",
                  color: lesson.dateCompleted ? "#1f2937" : B.muted,
                }}>
                  {lesson.dateCompleted || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      <div style={{
        background: `linear-gradient(135deg, ${B.navy} 0%, ${B.navyD} 100%)`,
        padding: "24px",
        borderRadius: "8px",
        marginBottom: "32px",
        color: "#fff",
      }}>
        <h2 style={{
          fontSize: "16px",
          fontWeight: 600,
          margin: "0 0 20px 0",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>
          Summary Statistics
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
        }}>
          <div>
            <div style={{
              fontSize: "32px",
              fontWeight: 700,
              marginBottom: "4px",
            }}>
              {totalLessons}
            </div>
            <div style={{
              fontSize: "12px",
              opacity: 0.8,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Total Lessons
            </div>
          </div>
          <div>
            <div style={{
              fontSize: "32px",
              fontWeight: 700,
              marginBottom: "4px",
            }}>
              {completedLessons.length}
            </div>
            <div style={{
              fontSize: "12px",
              opacity: 0.8,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Completed
            </div>
          </div>
          <div>
            <div style={{
              fontSize: "32px",
              fontWeight: 700,
              marginBottom: "4px",
            }}>
              {averageScore}%
            </div>
            <div style={{
              fontSize: "12px",
              opacity: 0.8,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Avg Score
            </div>
          </div>
          <div>
            <div style={{
              fontSize: "32px",
              fontWeight: 700,
              marginBottom: "4px",
            }}>
              {overallProgress}%
            </div>
            <div style={{
              fontSize: "12px",
              opacity: 0.8,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Overall Progress
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center",
        paddingTop: "20px",
        borderTop: `1px solid ${B.light}`,
        color: B.muted,
        fontSize: "12px",
      }}>
        <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>
          Al-Shamail Learning Platform
        </p>
        <p style={{ margin: 0 }}>
          Generated on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            margin: 20mm;
            size: A4;
          }
          body {
            margin: 0;
            padding: 0;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
    </>
  );
}
