#!/bin/bash
# Android Keystore 生成与签名脚本
# 用法: ./android-sign.sh [命令]
#
# 命令:
#   generate    生成新的 keystore
#   sign        为 APK 签名
#   verify      验证 APK 签名
#   base64      输出 keystore 的 base64（用于 GitHub Secrets）

set -e

KEYSTORE_NAME="twine-ide.keystore"
KEY_ALIAS="twine-ide"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
KEYSTORE_PATH="$PROJECT_DIR/$KEYSTORE_NAME"
ENV_FILE="$PROJECT_DIR/.keystore.env"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 从 .keystore.env 加载密码
load_password() {
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
        if [ -n "$KEYSTORE_PASSWORD" ]; then
            info "已从 .keystore.env 读取密码"
            return 0
        fi
    fi
    return 1
}

# 交互式获取密码（如果 .env 中没有）
get_password() {
    if load_password; then
        return 0
    fi
    read -sp "Keystore 密码: " KEYSTORE_PASSWORD
    echo ""
}

# 保存密码到 .keystore.env
save_password() {
    cat > "$ENV_FILE" <<EOF
# Android Keystore 密码配置
# 此文件已加入 .gitignore，不会被提交到仓库
KEYSTORE_PASSWORD="$1"
KEY_ALIAS="$KEY_ALIAS"
EOF
    chmod 600 "$ENV_FILE"
    info "密码已保存到 .keystore.env"
}

# 检查依赖
check_deps() {
    local missing=()
    command -v keytool   >/dev/null 2>&1 || missing+=("keytool (JDK)")
    command -v apksigner >/dev/null 2>&1 || missing+=("apksigner (Android SDK Build Tools)")
    command -v zipalign  >/dev/null 2>&1 || missing+=("zipalign (Android SDK Build Tools)")

    if [ ${#missing[@]} -gt 0 ]; then
        warn "缺少以下工具:"
        for tool in "${missing[@]}"; do
            echo "  - $tool"
        done
        echo ""
        warn "apksigner 和 zipalign 通常位于: \$ANDROID_HOME/build-tools/<version>/"
    fi
}

# 生成 keystore
cmd_generate() {
    if [ -f "$KEYSTORE_PATH" ]; then
        warn "Keystore 已存在: $KEYSTORE_PATH"
        read -p "是否覆盖? (y/N) " confirm
        [[ "$confirm" != [yY] ]] && exit 0
        rm "$KEYSTORE_PATH"
    fi

    info "生成新的 Keystore..."
    echo ""

    read -sp "Keystore 密码: " store_pass
    echo ""
    read -sp "确认密码: " store_pass_confirm
    echo ""

    if [ "$store_pass" != "$store_pass_confirm" ]; then
        error "两次密码不一致"
    fi

    if [ -z "$store_pass" ]; then
        error "密码不能为空"
    fi

    read -p "你的名字 (CN) [Twine IDE]: " cn
    cn="${cn:-Twine IDE}"

    keytool -genkey -v \
        -keystore "$KEYSTORE_PATH" \
        -alias "$KEY_ALIAS" \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass "$store_pass" \
        -keypass "$store_pass" \
        -dname "CN=$cn, OU=Dev, O=Twine, L=Unknown, ST=Unknown, C=US"

    save_password "$store_pass"

    echo ""
    info "Keystore 已生成: $KEYSTORE_PATH"
    info "别名: $KEY_ALIAS"
    warn "请妥善备份 keystore 文件和密码，丢失后无法恢复！"
}

# 签名 APK
cmd_sign() {
    local input_apk="$1"

    if [ -z "$input_apk" ]; then
        local default_apk="$PROJECT_DIR/android/app/build/outputs/apk/release/app-release-unsigned.apk"
        if [ -f "$default_apk" ]; then
            input_apk="$default_apk"
            info "使用默认 APK: $input_apk"
        else
            error "用法: $0 sign <apk文件路径>"
        fi
    fi

    [ -f "$input_apk" ] || error "APK 文件不存在: $input_apk"
    [ -f "$KEYSTORE_PATH" ] || error "Keystore 不存在，请先运行: $0 generate"

    get_password

    local output_apk="${input_apk%.apk}-signed.apk"
    local aligned_apk="${input_apk%.apk}-aligned.apk"

    info "zipalign 对齐..."
    zipalign -f 4 "$input_apk" "$aligned_apk"

    info "签名中..."
    apksigner sign \
        --ks "$KEYSTORE_PATH" \
        --ks-key-alias "$KEY_ALIAS" \
        --ks-pass "pass:$KEYSTORE_PASSWORD" \
        --key-pass "pass:$KEYSTORE_PASSWORD" \
        --out "$output_apk" \
        "$aligned_apk"

    rm -f "$aligned_apk"

    info "签名完成: $output_apk"
    echo ""
    apksigner verify --print-certs "$output_apk"
}

# 验证签名
cmd_verify() {
    local apk="$1"
    [ -z "$apk" ] && error "用法: $0 verify <apk文件路径>"
    [ -f "$apk" ] || error "APK 文件不存在: $apk"

    info "验证签名: $apk"
    echo ""

    if apksigner verify --verbose --print-certs "$apk" 2>&1; then
        echo ""
        info "签名有效"
    else
        echo ""
        error "签名无效或未签名"
    fi
}

# 输出 base64
cmd_base64() {
    [ -f "$KEYSTORE_PATH" ] || error "Keystore 不存在，请先运行: $0 generate"

    info "Keystore Base64（复制到 GitHub Secret KEYSTORE_BASE64）:"
    echo ""
    base64 -w 0 "$KEYSTORE_PATH"
    echo ""
}

# 帮助
cmd_help() {
    echo "Android Keystore 签名工具"
    echo ""
    echo "用法: $0 <命令> [参数]"
    echo ""
    echo "命令:"
    echo "  generate          生成新的 keystore（密码自动保存到 .keystore.env）"
    echo "  sign [apk路径]    为 APK 签名（自动读取 .keystore.env 中的密码）"
    echo "  verify <apk路径>  验证 APK 签名"
    echo "  base64            输出 keystore 的 base64（用于 GitHub Secrets）"
    echo "  help              显示此帮助"
}

# 主入口
check_deps

case "${1:-help}" in
    generate) cmd_generate ;;
    sign)     cmd_sign "$2" ;;
    verify)   cmd_verify "$2" ;;
    base64)   cmd_base64 ;;
    help|*)   cmd_help ;;
esac
