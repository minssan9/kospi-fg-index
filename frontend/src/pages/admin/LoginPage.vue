<template>
  <div class="flex flex-center bg-grey-2 full-height">
    <div class="login-container">
      <q-card class="login-card q-pa-lg">
        <q-card-section class="text-center">
          <div class="text-h4 text-weight-bold text-primary q-mb-md">
            🛠️ Admin Login
          </div>
          <div class="text-h6 text-grey-7 q-mb-lg">
            KOSPI Fear & Greed Index
          </div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleLogin" class="q-gutter-md">
            <q-input
              v-model="loginForm.username"
              type="text"
              label="사용자명"
              filled
              :rules="[val => !!val || '사용자명을 입력해주세요']"
              autocomplete="username"
            >
              <template v-slot:prepend>
                <q-icon name="person" />
              </template>
            </q-input>

            <q-input
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'"
              label="비밀번호"
              filled
              :rules="[val => !!val || '비밀번호를 입력해주세요']"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            >
              <template v-slot:prepend>
                <q-icon name="lock" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>

            <div class="row items-center q-mt-md">
              <q-checkbox
                v-model="rememberMe"
                label="로그인 상태 유지"
                color="primary"
              />
            </div>

            <q-btn
              type="submit"
              color="primary"
              size="lg"
              class="full-width q-mt-lg"
              label="로그인"
              :loading="logging"
              :disable="!isFormValid"
            />
          </q-form>
        </q-card-section>

        <q-card-section class="text-center">
          <div class="text-caption text-grey-6">
            관리자 계정으로만 접근 가능합니다
          </div>
          <div class="text-caption text-grey-6 q-mt-sm">
            Demo: admin / admin123
          </div>
        </q-card-section>
      </q-card>

      <!-- Background decoration -->
      <div class="bg-decoration">
        <div class="decoration-circle circle-1"></div>
        <div class="decoration-circle circle-2"></div>
        <div class="decoration-circle circle-3"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { adminApi } from '../../services/adminApi'

const router = useRouter()
const $q = useQuasar()

// Reactive data
const logging = ref(false)
const showPassword = ref(false)
const rememberMe = ref(false)

const loginForm = ref({
  username: '',
  password: ''
})

// Computed
const isFormValid = computed(() => {
  return loginForm.value.username.length > 0 && loginForm.value.password.length > 0
})

// Methods
async function handleLogin(): Promise<void> {
  if (!isFormValid.value) return

  logging.value = true
  try {
    const response = await adminApi.login(
      loginForm.value.username,
      loginForm.value.password
    )

    // Store authentication token
    const storage = rememberMe.value ? localStorage : sessionStorage
    storage.setItem('admin_token', response.token)
    storage.setItem('admin_user', JSON.stringify(response.user))

    $q.notify({
      type: 'positive',
      message: '로그인되었습니다.',
      caption: `환영합니다, ${response.user.username}님!`
    })

    // Redirect to admin dashboard
    router.push({ name: 'admin-dashboard' })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '로그인에 실패했습니다.',
      caption: error instanceof Error ? error.message : '사용자명 또는 비밀번호를 확인해주세요.'
    })
  } finally {
    logging.value = false
  }
}
</script>

<style lang="scss" scoped>
.full-height {
  min-height: 100vh;
  width: 100vw;
  position: relative;
}

.login-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  z-index: 10;
}

.login-card {
  position: relative;
  z-index: 100;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(25, 118, 210, 0.05));
  animation: float 6s ease-in-out infinite;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -150px;
  left: -150px;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  top: 50%;
  right: -100px;
  animation-delay: 2s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  bottom: -75px;
  left: 30%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

.q-form {
  .q-field {
    transition: all 0.3s ease;
    
    &:focus-within {
      transform: translateY(-2px);
    }
  }
}

@media (max-width: 480px) {
  .login-container {
    max-width: 90vw;
  }
  
  .login-card {
    margin: 0 16px;
  }
}
</style>