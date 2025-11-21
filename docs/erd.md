```mermaid
erDiagram

        Role {
            ADMIN ADMIN
DEPUTY DEPUTY
MANAGER MANAGER
SENIOR_MANAGER SENIOR_MANAGER
CLIENT CLIENT
DEPUTY_ADMIN DEPUTY_ADMIN
ACCOUNTANT ACCOUNTANT
        }
    


        TaskStatus {
            NEW NEW
AVAILABLE AVAILABLE
IN_PROGRESS IN_PROGRESS
COMPLETED COMPLETED
OVERDUE OVERDUE
FAILED FAILED
CLOSED_WITH_PHOTO CLOSED_WITH_PHOTO
        }
    


        RequestStatus {
            NEW NEW
IN_PROGRESS IN_PROGRESS
DONE DONE
REJECTED REJECTED
        }
    


        AdditionalTaskStatus {
            NEW NEW
IN_PROGRESS IN_PROGRESS
COMPLETED COMPLETED
        }
    


        ReportingTaskStatus {
            NEW NEW
IN_PROGRESS IN_PROGRESS
COMPLETED COMPLETED
CANCELLED CANCELLED
        }
    


        ReportingTaskPriority {
            LOW LOW
MEDIUM MEDIUM
HIGH HIGH
URGENT URGENT
        }
    


        TaskExecutionStatus {
            PENDING PENDING
COMPLETED COMPLETED
OVERDUE OVERDUE
SKIPPED SKIPPED
        }
    


        TaskAdminCommentType {
            ADMIN_NOTE ADMIN_NOTE
COMPLETION_FEEDBACK COMPLETION_FEEDBACK
INSTRUCTION INSTRUCTION
QUALITY_CHECK QUALITY_CHECK
        }
    


        ExpensePeriodType {
            DAILY DAILY
MONTHLY MONTHLY
SEMI_ANNUAL SEMI_ANNUAL
ANNUAL ANNUAL
        }
    
  "User" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    String email 
    String name "❓"
    String password 
    Role role 
    String phone "❓"
    String telegramId "❓"
    String telegramUsername "❓"
    String telegramFirstName "❓"
    String telegramLastName "❓"
    }
  

  "CleaningObject" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    String name 
    String address 
    Json documents "❓"
    String timezone "❓"
    Json workingHours "❓"
    String workStartTime "❓"
    String workEndTime "❓"
    String workingDays 
    String city "❓"
    Boolean autoChecklistEnabled 
    DateTime lastChecklistDate "❓"
    Boolean requirePhotoForCompletion 
    Json completionRequirements "❓"
    Boolean requireCommentForCompletion 
    String description "❓"
    String notes "❓"
    Float totalArea "❓"
    Boolean allowManagerEdit 
    }
  

  "Room" {
    String id "🗝️"
    DateTime createdAt 
    String name 
    String description "❓"
    Float area "❓"
    }
  

  "Site" {
    String id "🗝️"
    DateTime createdAt 
    String name 
    String description "❓"
    Float area "❓"
    String comment "❓"
    }
  

  "Zone" {
    String id "🗝️"
    DateTime createdAt 
    String name 
    String description "❓"
    Float area "❓"
    }
  

  "RoomGroup" {
    String id "🗝️"
    DateTime createdAt 
    String name 
    String description "❓"
    Float area "❓"
    }
  

  "CleaningObjectItem" {
    String id "🗝️"
    DateTime createdAt 
    String name 
    String description "❓"
    }
  

  "TechCard" {
    String id "🗝️"
    DateTime createdAt 
    String name 
    String workType 
    String frequency 
    String description "❓"
    String notes "❓"
    String period "❓"
    String workDetails "❓"
    String seasonality "❓"
    Int frequencyDays "❓"
    Int maxDelayHours "❓"
    String preferredTime "❓"
    Boolean autoGenerate 
    Boolean isActive 
    String timeSlots 
    }
  

  "Checklist" {
    String id "🗝️"
    DateTime createdAt 
    DateTime date 
    DateTime completedAt "❓"
    String completionComment "❓"
    String completionPhotos 
    String name "❓"
    }
  

  "Task" {
    String id "🗝️"
    DateTime createdAt 
    String description 
    TaskStatus status 
    String photoUrl "❓"
    String objectName "❓"
    String roomName "❓"
    DateTime scheduledStart "❓"
    DateTime scheduledEnd "❓"
    String failureReason "❓"
    DateTime completedAt "❓"
    String completionComment "❓"
    String completionPhotos 
    }
  

  "Request" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    String title 
    String description 
    RequestStatus status 
    String source "❓"
    }
  

  "ExpenseCategory" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    String name 
    String description "❓"
    Boolean isActive 
    Int sortOrder 
    }
  

  "ExpenseCategoryLimit" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    Decimal amount 
    ExpensePeriodType periodType 
    Int month "❓"
    Int year "❓"
    Boolean isRecurring 
    DateTime startDate "❓"
    DateTime endDate "❓"
    }
  

  "InventoryLimit" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    Decimal amount 
    Int month 
    Int year 
    Boolean isRecurring 
    DateTime endDate "❓"
    }
  

  "InventoryExpense" {
    String id "🗝️"
    DateTime createdAt 
    Decimal amount 
    String description "❓"
    Int month 
    Int year 
    }
  

  "PhotoReport" {
    String id "🗝️"
    DateTime createdAt 
    String url 
    String comment "❓"
    }
  

  "AuditLog" {
    String id "🗝️"
    DateTime createdAt 
    String action 
    String entity 
    String entityId 
    Json details "❓"
    }
  

  "ClientBinding" {
    String id "🗝️"
    DateTime createdAt 
    String telegramId 
    String telegramUsername "❓"
    String firstName "❓"
    String lastName "❓"
    }
  

  "AdditionalTask" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    String title 
    String content 
    String source 
    Json sourceDetails 
    String attachments 
    AdditionalTaskStatus status 
    DateTime takenAt "❓"
    DateTime completedAt "❓"
    String completionNote "❓"
    String completionPhotos 
    DateTime receivedAt 
    }
  

  "AdditionalTaskComment" {
    String id "🗝️"
    DateTime createdAt 
    String content 
    Boolean isAdmin 
    }
  

  "TelegramBindingCode" {
    String id "🗝️"
    DateTime createdAt 
    String code 
    DateTime expiresAt 
    }
  

  "DeputyAdminAssignment" {
    String id "🗝️"
    DateTime createdAt 
    }
  

  "ObjectStructure" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    String objectName 
    String objectAddress "❓"
    String siteName "❓"
    String zoneName "❓"
    String roomGroupName "❓"
    String roomName "❓"
    String cleaningObjectName "❓"
    String techCardName 
    String frequency 
    String notes "❓"
    String period "❓"
    String siteId "❓"
    String zoneId "❓"
    String roomGroupId "❓"
    String roomId "❓"
    String cleaningObjectId "❓"
    String techCardId 
    String workType "❓"
    String description "❓"
    }
  

  "ReportingTask" {
    String id "🗝️"
    String title 
    String description "❓"
    DateTime createdAt 
    DateTime updatedAt 
    DateTime dueDate "❓"
    DateTime completedAt "❓"
    String completionComment "❓"
    ReportingTaskStatus status 
    ReportingTaskPriority priority 
    Boolean isRecurring 
    String frequency "❓"
    Int weekDay "❓"
    DateTime stoppedAt "❓"
    String parentTaskId "❓"
    }
  

  "ReportingTaskComment" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    String content 
    }
  

  "ReportingTaskAttachment" {
    String id "🗝️"
    DateTime createdAt 
    String fileName 
    String originalName 
    Int fileSize 
    String mimeType 
    String filePath 
    }
  

  "ExcludedObject" {
    String id "🗝️"
    DateTime excludedAt 
    }
  

  "TaskExecution" {
    String id "🗝️"
    DateTime scheduledFor 
    DateTime dueDate 
    DateTime executedAt "❓"
    TaskExecutionStatus status 
    String comment "❓"
    String photos 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "task_admin_comments" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    String content 
    TaskAdminCommentType type 
    }
  

  "notifications" {
    String id "🗝️"
    DateTime createdAt 
    DateTime updatedAt 
    String type 
    String title 
    String message 
    Boolean isRead 
    }
  

  "manual_sections" {
    String id "🗝️"
    String slug 
    String title 
    Int order 
    String content 
    String icon "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "manual_screenshots" {
    String id "🗝️"
    Int number 
    String filename 
    String description 
    String alt 
    DateTime createdAt 
    DateTime updatedAt 
    }
  
    "User" o|--|| "Role" : "enum:role"
    "User" o{--}o "AdditionalTask" : "assignedAdditionalTasks"
    "User" o{--}o "AdditionalTask" : "completedAdditionalTasks"
    "User" o{--}o "AuditLog" : "auditLogs"
    "User" o{--}o "Checklist" : "completedChecklists"
    "User" o{--}o "Checklist" : "createdChecklists"
    "User" o{--}o "CleaningObject" : "createdObjects"
    "User" o{--}o "CleaningObject" : "managedObjects"
    "User" o{--}o "DeputyAdminAssignment" : "assignedDeputyAdmins"
    "User" o{--}o "DeputyAdminAssignment" : "deputyAdminAssignments"
    "User" o{--}o "ExcludedObject" : "excludedObjects"
    "User" o{--}o "InventoryExpense" : "inventoryExpenses"
    "User" o{--}o "InventoryLimit" : "setInventoryLimits"
    "User" o{--}o "ExpenseCategoryLimit" : "setExpenseCategoryLimits"
    "User" o{--}o "PhotoReport" : "photoReports"
    "User" o{--}o "ReportingTask" : "assignedReportingTasks"
    "User" o{--}o "ReportingTask" : "createdReportingTasks"
    "User" o{--}o "Request" : "createdRequests"
    "User" o{--}o "Site" : "managedSites"
    "User" o{--}o "Site" : "seniorManagedSites"
    "User" o{--}o "Task" : "completedTasks"
    "User" o{--}o "TaskExecution" : "taskExecutions"
    "User" o{--}o "notifications" : "notifications"
    "User" o{--}o "task_admin_comments" : "adminComments"
    "User" o{--}o "ReportingTaskAttachment" : "reportingTaskAttachments"
    "User" o{--}o "ReportingTaskComment" : "reportingTaskComments"
    "User" o{--}o "AdditionalTaskComment" : "additionalTaskComments"
    "User" o{--}o "TelegramBindingCode" : "telegramBindingCode"
    "CleaningObject" o{--}o "AdditionalTask" : "additionalTasks"
    "CleaningObject" o{--}o "Checklist" : "checklists"
    "CleaningObject" o|--|| "User" : "creator"
    "CleaningObject" o|--|o "User" : "manager"
    "CleaningObject" o{--}o "ClientBinding" : "clientBindings"
    "CleaningObject" o{--}o "DeputyAdminAssignment" : "deputyAdminAssignments"
    "CleaningObject" o{--}o "ExcludedObject" : "excludedObjects"
    "CleaningObject" o{--}o "InventoryExpense" : "inventoryExpenses"
    "CleaningObject" o{--}o "InventoryLimit" : "inventoryLimits"
    "CleaningObject" o{--}o "ExpenseCategoryLimit" : "expenseCategoryLimits"
    "CleaningObject" o{--}o "ObjectStructure" : "objectStructures"
    "CleaningObject" o{--}o "PhotoReport" : "photoReports"
    "CleaningObject" o{--}o "ReportingTask" : "reportingTasks"
    "CleaningObject" o{--}o "Request" : "requests"
    "CleaningObject" o{--}o "Room" : "rooms"
    "CleaningObject" o{--}o "Site" : "sites"
    "CleaningObject" o{--}o "TaskExecution" : "taskExecutions"
    "CleaningObject" o{--}o "TechCard" : "techCards"
    "Room" o{--}o "Checklist" : "checklists"
    "Room" o{--}o "CleaningObjectItem" : "cleaningObjects"
    "Room" o|--|| "CleaningObject" : "object"
    "Room" o|--|o "RoomGroup" : "roomGroup"
    "Room" o{--}o "Task" : "tasks"
    "Room" o{--}o "TechCard" : "techCards"
    "Site" o|--|o "User" : "manager"
    "Site" o|--|o "User" : "seniorManager"
    "Site" o|--|| "CleaningObject" : "object"
    "Site" o{--}o "Zone" : "zones"
    "Zone" o{--}o "RoomGroup" : "roomGroups"
    "Zone" o|--|| "Site" : "site"
    "RoomGroup" o{--}o "Room" : "rooms"
    "RoomGroup" o|--|| "Zone" : "zone"
    "CleaningObjectItem" o|--|| "Room" : "room"
    "CleaningObjectItem" o{--}o "TechCard" : "techCards"
    "TechCard" o{--}o "TaskExecution" : "executions"
    "TechCard" o|--|o "CleaningObjectItem" : "cleaningObjectItem"
    "TechCard" o|--|| "CleaningObject" : "object"
    "TechCard" o|--|o "Room" : "room"
    "Checklist" o|--|o "User" : "completedBy"
    "Checklist" o|--|| "User" : "creator"
    "Checklist" o|--|| "CleaningObject" : "object"
    "Checklist" o|--|o "Room" : "room"
    "Checklist" o{--}o "PhotoReport" : "photoReports"
    "Checklist" o{--}o "Task" : "tasks"
    "Task" o|--|| "TaskStatus" : "enum:status"
    "Task" o{--}o "PhotoReport" : "photoReports"
    "Task" o|--|o "Checklist" : "checklist"
    "Task" o|--|o "User" : "completedBy"
    "Task" o|--|o "Request" : "request"
    "Task" o|--|o "Room" : "room"
    "Task" o{--}o "notifications" : "notifications"
    "Task" o{--}o "task_admin_comments" : "adminComments"
    "Request" o|--|| "RequestStatus" : "enum:status"
    "Request" o{--}o "PhotoReport" : "photoReports"
    "Request" o|--|| "User" : "creator"
    "Request" o|--|| "CleaningObject" : "object"
    "Request" o{--}o "Task" : "tasks"
    "ExpenseCategory" o{--}o "ExpenseCategoryLimit" : "limits"
    "ExpenseCategory" o{--}o "InventoryExpense" : "expenses"
    "ExpenseCategoryLimit" o|--|| "ExpensePeriodType" : "enum:periodType"
    "ExpenseCategoryLimit" o|--|| "CleaningObject" : "object"
    "ExpenseCategoryLimit" o|--|| "ExpenseCategory" : "category"
    "ExpenseCategoryLimit" o|--|| "User" : "setBy"
    "InventoryLimit" o|--|| "CleaningObject" : "object"
    "InventoryLimit" o|--|| "User" : "setBy"
    "InventoryExpense" o|--|| "CleaningObject" : "object"
    "InventoryExpense" o|--|o "ExpenseCategory" : "category"
    "InventoryExpense" o|--|| "User" : "recordedBy"
    "PhotoReport" o|--|o "Checklist" : "checklist"
    "PhotoReport" o|--|o "CleaningObject" : "object"
    "PhotoReport" o|--|o "Request" : "request"
    "PhotoReport" o|--|o "Task" : "task"
    "PhotoReport" o|--|| "User" : "uploader"
    "AuditLog" o|--|| "User" : "user"
    "ClientBinding" o|--|| "CleaningObject" : "object"
    "AdditionalTask" o|--|| "AdditionalTaskStatus" : "enum:status"
    "AdditionalTask" o|--|| "User" : "assignedTo"
    "AdditionalTask" o|--|o "User" : "completedBy"
    "AdditionalTask" o|--|| "CleaningObject" : "object"
    "AdditionalTask" o{--}o "AdditionalTaskComment" : "comments"
    "AdditionalTaskComment" o|--|| "AdditionalTask" : "task"
    "AdditionalTaskComment" o|--|| "User" : "user"
    "TelegramBindingCode" o|--|| "User" : "user"
    "DeputyAdminAssignment" o|--|| "User" : "assignedBy"
    "DeputyAdminAssignment" o|--|| "User" : "deputyAdmin"
    "DeputyAdminAssignment" o|--|| "CleaningObject" : "object"
    "ObjectStructure" o|--|| "CleaningObject" : "object"
    "ReportingTask" o|--|| "ReportingTaskStatus" : "enum:status"
    "ReportingTask" o|--|| "ReportingTaskPriority" : "enum:priority"
    "ReportingTask" o|--|| "User" : "assignedTo"
    "ReportingTask" o|--|| "User" : "createdBy"
    "ReportingTask" o|--|| "CleaningObject" : "object"
    "ReportingTask" o{--}o "ReportingTaskAttachment" : "attachments"
    "ReportingTask" o{--}o "ReportingTaskComment" : "comments"
    "ReportingTaskComment" o|--|| "ReportingTask" : "task"
    "ReportingTaskComment" o|--|| "User" : "author"
    "ReportingTaskAttachment" o|--|| "ReportingTask" : "task"
    "ReportingTaskAttachment" o|--|| "User" : "uploadedBy"
    "ExcludedObject" o|--|| "User" : "excludedBy"
    "ExcludedObject" o|--|| "CleaningObject" : "object"
    "TaskExecution" o|--|| "TaskExecutionStatus" : "enum:status"
    "TaskExecution" o|--|| "User" : "manager"
    "TaskExecution" o|--|| "CleaningObject" : "object"
    "TaskExecution" o|--|| "TechCard" : "techCard"
    "task_admin_comments" o|--|| "TaskAdminCommentType" : "enum:type"
    "task_admin_comments" o|--|| "User" : "admin"
    "task_admin_comments" o|--|o "task_admin_comments" : "parentComment"
    "task_admin_comments" o{--}o "task_admin_comments" : "replies"
    "task_admin_comments" o|--|| "Task" : "task"
    "notifications" o|--|o "Task" : "relatedTask"
    "notifications" o|--|| "User" : "user"
```
