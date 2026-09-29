#!/usr/bin/env bash
# genuser.sh — 用户名生成器（兼容各种 Bash 版本）

INPUT="" OUTPUT="" FORMATS="" DOMAIN=""
DEDUP=0 NUMBER=0 FORCE_LOWER=0 QUIET=0

usage() {
  echo "用法: $0 -i <文件> -f <格式串> [选项]"
  echo "  -i, --input FILE     姓名文件（每行：名 [中间名] 姓）"
  echo "  -f, --format STR     逗号分隔的格式串"
  echo "  -o, --output FILE    输出文件"
  echo "  -d, --domain STR     追加后缀，如 '@corp.local'"
  echo "  -nd, --no-dup        去重"
  echo "  -n,  --number        重名自动加序号 1、2、3..."
  echo "  -L,  --lower         全部转小写"
  echo "  -q,  --quiet         静默模式"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -i|--input)    INPUT="$2"; shift 2;;
    -o|--output)   OUTPUT="$2"; shift 2;;
    -f|--format)   FORMATS="$2"; shift 2;;
    -d|--domain)   DOMAIN="$2"; shift 2;;
    -nd|--no-dup)  DEDUP=1; shift;;
    -n|--number)   NUMBER=1; shift;;
    -L|--lower)    FORCE_LOWER=1; shift;;
    -q|--quiet)    QUIET=1; shift;;
    -h|--help)     usage; exit 0;;
    *) echo "未知参数: $1" >&2; usage; exit 1;;
  esac
done

[[ -z "$INPUT" || -z "$FORMATS" ]] && { echo "错误: -i 和 -f 为必选参数"; usage; exit 1; }
[[ "$INPUT" != "-" && ! -f "$INPUT" ]] && { echo "错误: 文件不存在: $INPUT"; exit 1; }

expand() {
  local fmt="$1" first="$2" last="$3" mid="$4"
  local fi_char="${first:0:1}"
  local li_char="${last:0:1}"
  local mi_char="${mid:0:1}"
  
  # 兼容的大小写转换
  local FL="$(echo "$fi_char" | tr '[:lower:]' '[:upper:]')"
  local LI="$(echo "$li_char" | tr '[:lower:]' '[:upper:]')"
  local MI="$(echo "$mi_char" | tr '[:lower:]' '[:upper:]')"

  local out="" i=0 n=${#fmt} tok

  while (( i < n )); do
    local ch="${fmt:i:1}"
    if [[ "$ch" == "{" ]]; then
      local j=$((i+1))
      while (( j < n )) && [[ "${fmt:j:1}" != "}" ]]; do ((j++)); done
      tok="${fmt:i+1:j-i-1}"
      i=$((j+1))
    else
      tok=""
      if [[ "${fmt:i}" == first* ]]; then tok="first"; i=$((i+5))
      elif [[ "${fmt:i}" == last* ]];  then tok="last";  i=$((i+4))
      else tok="$ch"; i=$((i+1))
      fi
    fi

    case "$tok" in
      first)     out+="$first" ;;
      last)      out+="$last" ;;
      f)         out+="$fi_char" ;;
      F)         out+="$FL" ;;
      l)         out+="$li_char" ;;
      L)         out+="$LI" ;;
      m)         out+="$mi_char" ;;
      M)         out+="$MI" ;;
      n)         out+="__NUM__" ;;
      *)         out+="$tok" ;;
    esac
  done
  printf '%s' "$out"
}

declare -A CNT
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT

while IFS= read -r line || [[ -n "$line" ]]; do
  # 过滤空行和注释
  [[ -z "${line// /}" || "$line" =~ ^[[:space:]]*# ]] && continue
  
  # 清理首尾空格
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  
  read -ra w <<< "$line"
  (( ${#w[@]} < 2 )) && continue

  first="${w[0]}"
  last="${w[-1]}"
  mid=""
  for ((k=1; k<${#w[@]}-1; k++)); do mid+="${w[k]:0:1}"; done

  IFS=',' read -ra flist <<< "$FORMATS"
  for fmt in "${flist[@]}"; do
    [[ -z "$fmt" ]] && continue
    u=$(expand "$fmt" "$first" "$last" "$mid")
    
    # 处理序号
    if [[ "$u" == *"__NUM__"* ]]; then
      base="${u//__NUM__/}"
      if (( NUMBER )); then
        c=${CNT["$base"]:-0}; ((c++)); CNT["$base"]=$c
        u="${base}${c}"
      else
        u="$base"
      fi
    fi
    
    (( FORCE_LOWER )) && u="${u,,}"
    [[ -n "$DOMAIN" ]] && u+="$DOMAIN"
    echo "$u"
  done
done < <( [[ "$INPUT" == "-" ]] && cat || cat "$INPUT" ) > "$tmp"

if (( DEDUP )); then
  awk '!seen[$0]++' "$tmp" > "${tmp}.2" && mv "${tmp}.2" "$tmp"
fi

if [[ -n "$OUTPUT" ]]; then 
  mv "$tmp" "$OUTPUT"
  trap - EXIT
  (( QUIET == 0 )) && echo "[+] 已写入 $OUTPUT（共 $(wc -l <"$OUTPUT") 条）"
else 
  cat "$tmp"
fi
