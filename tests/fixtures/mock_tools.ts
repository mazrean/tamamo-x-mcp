/**
 * Mock tool catalog for testing grouping functionality
 * Contains 60 diverse tools across multiple domains
 */

import type { Tool } from "../../src/types/index.ts";

export const MOCK_TOOLS: Tool[] = [
  // File Operations (12 tools)
  {
    name: "read_file",
    description: "Read contents of a file from the filesystem",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to read" },
      },
      required: ["path"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "write_file",
    description: "Write content to a file on the filesystem",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to write" },
        content: { type: "string", description: "Content to write" },
      },
      required: ["path", "content"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "list_directory",
    description: "List all files and directories in a given path",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path to list" },
        recursive: { type: "boolean", description: "List recursively" },
      },
      required: ["path"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "delete_file",
    description: "Delete a file from the filesystem",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to delete" },
      },
      required: ["path"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "move_file",
    description: "Move or rename a file",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Source path" },
        destination: { type: "string", description: "Destination path" },
      },
      required: ["source", "destination"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "copy_file",
    description: "Copy a file to a new location",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Source path" },
        destination: { type: "string", description: "Destination path" },
      },
      required: ["source", "destination"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "create_directory",
    description: "Create a new directory",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path to create" },
      },
      required: ["path"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "get_file_info",
    description: "Get metadata about a file (size, modified date, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
      },
      required: ["path"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "search_files",
    description: "Search for files matching a pattern",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Search pattern (glob)" },
        directory: { type: "string", description: "Directory to search in" },
      },
      required: ["pattern"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "watch_file",
    description: "Watch a file for changes",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to watch" },
      },
      required: ["path"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "get_file_permissions",
    description: "Get file permissions and ownership info",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
      },
      required: ["path"],
    },
    serverName: "filesystem-server",
  },
  {
    name: "set_file_permissions",
    description: "Set file permissions",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        mode: { type: "string", description: "Permission mode (e.g., '0644')" },
      },
      required: ["path", "mode"],
    },
    serverName: "filesystem-server",
  },

  // Git Operations (10 tools)
  {
    name: "git_status",
    description: "Get current git repository status",
    inputSchema: {
      type: "object",
      properties: {
        repository: { type: "string", description: "Repository path" },
      },
      required: [],
    },
    serverName: "git-server",
  },
  {
    name: "git_commit",
    description: "Create a new git commit",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Commit message" },
        files: { type: "array", items: { type: "string" }, description: "Files to commit" },
      },
      required: ["message"],
    },
    serverName: "git-server",
  },
  {
    name: "git_push",
    description: "Push commits to remote repository",
    inputSchema: {
      type: "object",
      properties: {
        remote: { type: "string", description: "Remote name" },
        branch: { type: "string", description: "Branch name" },
      },
      required: [],
    },
    serverName: "git-server",
  },
  {
    name: "git_pull",
    description: "Pull changes from remote repository",
    inputSchema: {
      type: "object",
      properties: {
        remote: { type: "string", description: "Remote name" },
        branch: { type: "string", description: "Branch name" },
      },
      required: [],
    },
    serverName: "git-server",
  },
  {
    name: "git_branch",
    description: "List, create, or delete branches",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "create", "delete"] },
        name: { type: "string", description: "Branch name" },
      },
      required: ["action"],
    },
    serverName: "git-server",
  },
  {
    name: "git_log",
    description: "Show commit history",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of commits to show" },
      },
      required: [],
    },
    serverName: "git-server",
  },
  {
    name: "git_diff",
    description: "Show differences between commits or working tree",
    inputSchema: {
      type: "object",
      properties: {
        ref1: { type: "string", description: "First reference" },
        ref2: { type: "string", description: "Second reference" },
      },
      required: [],
    },
    serverName: "git-server",
  },
  {
    name: "git_checkout",
    description: "Switch branches or restore files",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string", description: "Branch or commit to checkout" },
      },
      required: ["ref"],
    },
    serverName: "git-server",
  },
  {
    name: "git_merge",
    description: "Merge branches",
    inputSchema: {
      type: "object",
      properties: {
        branch: { type: "string", description: "Branch to merge" },
      },
      required: ["branch"],
    },
    serverName: "git-server",
  },
  {
    name: "git_tag",
    description: "Create, list, or delete tags",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "create", "delete"] },
        name: { type: "string", description: "Tag name" },
      },
      required: ["action"],
    },
    serverName: "git-server",
  },

  // Database Operations (12 tools)
  {
    name: "db_query",
    description: "Execute a SQL query",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "SQL query to execute" },
        params: { type: "array", description: "Query parameters" },
      },
      required: ["query"],
    },
    serverName: "database-server",
  },
  {
    name: "db_insert",
    description: "Insert records into a database table",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name" },
        data: { type: "object", description: "Data to insert" },
      },
      required: ["table", "data"],
    },
    serverName: "database-server",
  },
  {
    name: "db_update",
    description: "Update records in a database table",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name" },
        data: { type: "object", description: "Data to update" },
        where: { type: "object", description: "Where clause" },
      },
      required: ["table", "data"],
    },
    serverName: "database-server",
  },
  {
    name: "db_delete",
    description: "Delete records from a database table",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name" },
        where: { type: "object", description: "Where clause" },
      },
      required: ["table"],
    },
    serverName: "database-server",
  },
  {
    name: "db_create_table",
    description: "Create a new database table",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Table name" },
        schema: { type: "object", description: "Table schema definition" },
      },
      required: ["name", "schema"],
    },
    serverName: "database-server",
  },
  {
    name: "db_drop_table",
    description: "Drop a database table",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Table name" },
      },
      required: ["name"],
    },
    serverName: "database-server",
  },
  {
    name: "db_list_tables",
    description: "List all tables in the database",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    serverName: "database-server",
  },
  {
    name: "db_get_schema",
    description: "Get schema information for a table",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name" },
      },
      required: ["table"],
    },
    serverName: "database-server",
  },
  {
    name: "db_begin_transaction",
    description: "Begin a database transaction",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    serverName: "database-server",
  },
  {
    name: "db_commit",
    description: "Commit current transaction",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    serverName: "database-server",
  },
  {
    name: "db_rollback",
    description: "Rollback current transaction",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    serverName: "database-server",
  },
  {
    name: "db_backup",
    description: "Create a database backup",
    inputSchema: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Backup file path" },
      },
      required: ["destination"],
    },
    serverName: "database-server",
  },

  // Web/HTTP Operations (10 tools)
  {
    name: "http_get",
    description: "Send HTTP GET request",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to request" },
        headers: { type: "object", description: "Request headers" },
      },
      required: ["url"],
    },
    serverName: "http-server",
  },
  {
    name: "http_post",
    description: "Send HTTP POST request",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to request" },
        body: { type: "object", description: "Request body" },
        headers: { type: "object", description: "Request headers" },
      },
      required: ["url", "body"],
    },
    serverName: "http-server",
  },
  {
    name: "http_put",
    description: "Send HTTP PUT request",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to request" },
        body: { type: "object", description: "Request body" },
        headers: { type: "object", description: "Request headers" },
      },
      required: ["url", "body"],
    },
    serverName: "http-server",
  },
  {
    name: "http_delete",
    description: "Send HTTP DELETE request",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to request" },
        headers: { type: "object", description: "Request headers" },
      },
      required: ["url"],
    },
    serverName: "http-server",
  },
  {
    name: "parse_html",
    description: "Parse HTML content and extract data",
    inputSchema: {
      type: "object",
      properties: {
        html: { type: "string", description: "HTML content" },
        selector: { type: "string", description: "CSS selector" },
      },
      required: ["html"],
    },
    serverName: "http-server",
  },
  {
    name: "download_file",
    description: "Download file from URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "File URL" },
        destination: { type: "string", description: "Save path" },
      },
      required: ["url", "destination"],
    },
    serverName: "http-server",
  },
  {
    name: "check_url_status",
    description: "Check if a URL is accessible",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to check" },
      },
      required: ["url"],
    },
    serverName: "http-server",
  },
  {
    name: "fetch_json_api",
    description: "Fetch and parse JSON from API",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "API endpoint" },
        method: { type: "string", enum: ["GET", "POST"], description: "HTTP method" },
      },
      required: ["url"],
    },
    serverName: "http-server",
  },
  {
    name: "set_http_timeout",
    description: "Configure HTTP request timeout",
    inputSchema: {
      type: "object",
      properties: {
        timeout: { type: "number", description: "Timeout in milliseconds" },
      },
      required: ["timeout"],
    },
    serverName: "http-server",
  },
  {
    name: "follow_redirects",
    description: "Configure redirect following behavior",
    inputSchema: {
      type: "object",
      properties: {
        enabled: { type: "boolean", description: "Enable/disable redirects" },
        maxRedirects: { type: "number", description: "Maximum redirects to follow" },
      },
      required: ["enabled"],
    },
    serverName: "http-server",
  },

  // Data Processing (8 tools)
  {
    name: "parse_json",
    description: "Parse JSON string into object",
    inputSchema: {
      type: "object",
      properties: {
        json: { type: "string", description: "JSON string to parse" },
      },
      required: ["json"],
    },
    serverName: "data-server",
  },
  {
    name: "parse_csv",
    description: "Parse CSV data into structured format",
    inputSchema: {
      type: "object",
      properties: {
        csv: { type: "string", description: "CSV data" },
        delimiter: { type: "string", description: "Field delimiter" },
      },
      required: ["csv"],
    },
    serverName: "data-server",
  },
  {
    name: "parse_xml",
    description: "Parse XML data into structured format",
    inputSchema: {
      type: "object",
      properties: {
        xml: { type: "string", description: "XML data" },
      },
      required: ["xml"],
    },
    serverName: "data-server",
  },
  {
    name: "convert_format",
    description: "Convert data between formats (JSON, CSV, XML, YAML)",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "string", description: "Input data" },
        from: { type: "string", description: "Source format" },
        to: { type: "string", description: "Target format" },
      },
      required: ["data", "from", "to"],
    },
    serverName: "data-server",
  },
  {
    name: "validate_schema",
    description: "Validate data against JSON schema",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "object", description: "Data to validate" },
        schema: { type: "object", description: "JSON schema" },
      },
      required: ["data", "schema"],
    },
    serverName: "data-server",
  },
  {
    name: "transform_data",
    description: "Transform data using JSONPath or similar query language",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "object", description: "Input data" },
        query: { type: "string", description: "Transformation query" },
      },
      required: ["data", "query"],
    },
    serverName: "data-server",
  },
  {
    name: "merge_objects",
    description: "Merge multiple objects into one",
    inputSchema: {
      type: "object",
      properties: {
        objects: { type: "array", description: "Objects to merge" },
        strategy: { type: "string", enum: ["shallow", "deep"], description: "Merge strategy" },
      },
      required: ["objects"],
    },
    serverName: "data-server",
  },
  {
    name: "filter_array",
    description: "Filter array elements based on criteria",
    inputSchema: {
      type: "object",
      properties: {
        array: { type: "array", description: "Array to filter" },
        condition: { type: "string", description: "Filter condition" },
      },
      required: ["array", "condition"],
    },
    serverName: "data-server",
  },

  // System Monitoring (8 tools)
  {
    name: "get_system_info",
    description: "Get system information (CPU, memory, OS)",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    serverName: "system-server",
  },
  {
    name: "monitor_cpu",
    description: "Monitor CPU usage",
    inputSchema: {
      type: "object",
      properties: {
        interval: { type: "number", description: "Monitoring interval in ms" },
      },
      required: [],
    },
    serverName: "system-server",
  },
  {
    name: "monitor_memory",
    description: "Monitor memory usage",
    inputSchema: {
      type: "object",
      properties: {
        interval: { type: "number", description: "Monitoring interval in ms" },
      },
      required: [],
    },
    serverName: "system-server",
  },
  {
    name: "monitor_disk",
    description: "Monitor disk usage and I/O",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Disk path to monitor" },
      },
      required: [],
    },
    serverName: "system-server",
  },
  {
    name: "list_processes",
    description: "List running processes",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "string", description: "Process name filter" },
      },
      required: [],
    },
    serverName: "system-server",
  },
  {
    name: "kill_process",
    description: "Terminate a process",
    inputSchema: {
      type: "object",
      properties: {
        pid: { type: "number", description: "Process ID" },
        signal: { type: "string", description: "Signal to send" },
      },
      required: ["pid"],
    },
    serverName: "system-server",
  },
  {
    name: "get_network_stats",
    description: "Get network usage statistics",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    serverName: "system-server",
  },
  {
    name: "check_service_status",
    description: "Check status of system services",
    inputSchema: {
      type: "object",
      properties: {
        service: { type: "string", description: "Service name" },
      },
      required: ["service"],
    },
    serverName: "system-server",
  },
];

/**
 * Helper function to get tools by category
 */
export function getToolsByCategory(category: string): Tool[] {
  const categories: Record<string, string[]> = {
    filesystem: [
      "read_file",
      "write_file",
      "list_directory",
      "delete_file",
      "move_file",
      "copy_file",
      "create_directory",
      "get_file_info",
      "search_files",
      "watch_file",
      "get_file_permissions",
      "set_file_permissions",
    ],
    git: [
      "git_status",
      "git_commit",
      "git_push",
      "git_pull",
      "git_branch",
      "git_log",
      "git_diff",
      "git_checkout",
      "git_merge",
      "git_tag",
    ],
    database: [
      "db_query",
      "db_insert",
      "db_update",
      "db_delete",
      "db_create_table",
      "db_drop_table",
      "db_list_tables",
      "db_get_schema",
      "db_begin_transaction",
      "db_commit",
      "db_rollback",
      "db_backup",
    ],
    http: [
      "http_get",
      "http_post",
      "http_put",
      "http_delete",
      "parse_html",
      "download_file",
      "check_url_status",
      "fetch_json_api",
      "set_http_timeout",
      "follow_redirects",
    ],
    data: [
      "parse_json",
      "parse_csv",
      "parse_xml",
      "convert_format",
      "validate_schema",
      "transform_data",
      "merge_objects",
      "filter_array",
    ],
    system: [
      "get_system_info",
      "monitor_cpu",
      "monitor_memory",
      "monitor_disk",
      "list_processes",
      "kill_process",
      "get_network_stats",
      "check_service_status",
    ],
  };

  const toolNames = categories[category] || [];
  return MOCK_TOOLS.filter((tool) => toolNames.includes(tool.name));
}

/**
 * Get a subset of tools for testing
 */
export function getToolSubset(count: number): Tool[] {
  return MOCK_TOOLS.slice(0, count);
}
