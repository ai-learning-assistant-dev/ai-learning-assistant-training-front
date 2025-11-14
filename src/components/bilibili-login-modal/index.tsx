import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { serverHost } from '@/server/training-server';

interface CaptchaData {
  geetest_seccode: string;
  geetest_validate: string;
  gt: string;
  challenge: string;
  success: boolean;
}

// 短信发送接口响应
interface SmsResponse {
  message: string;
  data: {
    code: number;
    message?: string;
    data?: {
      captcha_key: string;
    };
  };
}

// 登录接口响应
interface LoginResponse {
  message: string;
  data: {
    code: number;
    message?: string;
  };
}

// 验证码接口响应
interface CaptchaResponse {
  data: {
    data: {
      token: string;
      geetest: {
        gt: string;
        challenge: string;
      };
    };
  };
}

interface CaptchaInstance {
  onSuccess: (callback: () => void) => void;
  getValidate: () => CaptchaData;
  appendTo: (element: string) => void;
  show: () => void;
  verify: () => void;
  onReady: (callback: () => void) => void;
}
// 极验初始化参数
interface InitGeetestOptions {
  gt: string;
  challenge: string;
  product: string;
  offline: boolean;
  new_captcha: boolean;
  width: string;
  https: boolean;
}
declare global {
  interface Window {
    initGeetest?: (options: InitGeetestOptions, callback: (captchaObj: CaptchaInstance) => void) => void;
  }
}

interface SmsLoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (phone: string, code: string) => void;
}

const BilibiliLoginModal: React.FC<SmsLoginModalProps> = ({ visible, onClose, onSuccess }) => {
  const [phone, setPhone] = useState<string>('');
  const [code, setCode] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [token, setToken] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [challenge, setChallenge] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [validate, setValidate] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [seccode, setSeccode] = useState<string>('');
  const [captchaKey, setCaptchaKey] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCaptchaReady, setIsCaptchaReady] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const captchaInstanceRef = useRef<CaptchaInstance | null>(null);
  const phoneRef = useRef<string>(phone);

  // Update the ref whenever phone changes
  useEffect(() => {
    phoneRef.current = phone;
  }, [phone]);

  const isPhoneValid = useMemo(() => {
    const valid = /^(1[3-9]\d{9})$/.test(phone);
    return valid;
  }, [phone]); 

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setPhone(value);
    setErrorMessage('');
  };

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.replace(/\D/g, ''));
    setErrorMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setPhone('');
    setCode('');
    setToken('');
    setChallenge('');
    setValidate('');
    setSeccode('');
    setCaptchaKey('');
    setIsSending(false);
    setIsLoading(false);
    setIsCaptchaReady(false);
    setErrorMessage('');
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(0);
  };


  function getCap() {
    if (captchaInstanceRef.current) {
      captchaInstanceRef.current.verify();
    }
  }
  const bindToButton = (instance: CaptchaInstance) => {
    captchaInstanceRef.current = instance;
  };

  const generateCaptcha = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${serverHost}/proxy/bilibili/captcha`);
      const data: CaptchaResponse = await res.json();

      if (!data?.data?.data?.geetest?.gt) {
        throw new Error('验证码数据结构无效');
      }

      const localToken = data.data.data.token;
      const localChallenge = data.data.data.geetest.challenge;

      setToken(localToken);
      setChallenge(localChallenge);

      if (window.initGeetest) {
        window.initGeetest({
          gt: data.data.data.geetest.gt,
          challenge: localChallenge,
          product: 'bind',
          offline: false,
          new_captcha: true,
          width: "300px",
          https: true,
        }, (captchaObj: CaptchaInstance) => {
          captchaObj.onReady(() => {
            setIsCaptchaReady(true);
            bindToButton(captchaObj);
          });
          captchaObj.onSuccess(() => {
            const result = captchaObj.getValidate();
            setValidate(result.geetest_validate);
            setSeccode(result.geetest_seccode);
            // Pass validate and seccode directly to avoid any potential staleness from async setState
            sendMsg(result.geetest_validate, result.geetest_seccode, localToken, localChallenge);
          });
        });
      }
    } catch (error) {
      setErrorMessage('获取验证码失败: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      generateCaptcha();
    }

    return () => {
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, [visible]);

  const sendMsg = async (validateOverride: string, seccodeOverride: string, tokenOverride: string, challengeOverride: string) => {
    // Use ref for latest phone
    const currentPhone = phoneRef.current;
    const currentIsValid = /^(1[3-9]\d{9})$/.test(currentPhone);


    if (!currentIsValid) {
      setErrorMessage('请输入有效的11位手机号'); // 明确错误提示
      return;
    }

    setIsSending(true);
    setErrorMessage('');

    const body = new URLSearchParams();
    body.append('cid', '86');
    body.append('tel', currentPhone);
    body.append('source', 'main_mini');
    body.append('token', tokenOverride);
    body.append('challenge', challengeOverride);
    body.append('validate', validateOverride);
    body.append('seccode', seccodeOverride);

    try {
      const res = await fetch(`${serverHost}/proxy/bilibili/sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });

      const data: SmsResponse = await res.json();

      if (data.data.code !== 0) {
        throw new Error(data.message || '发送失败');
      }

      if (data?.data?.data?.captcha_key) {
        setCaptchaKey(data.data.data.captcha_key);
      } else {
        throw new Error('captcha_key 不存在于响应数据中');
      }
      setErrorMessage('短信发送成功');

      startCountdown();
    } catch (error) {
      setErrorMessage('短信发送失败: ' + (error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);

    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }

    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 0) {
          return prev - 1;
        } else {
          if (countdownTimer.current) {
            clearInterval(countdownTimer.current);
            countdownTimer.current = null;
          }
          return 0;
        }
      });
    }, 1000);
  };

  const handleLogin = async () => {
    if (!isPhoneValid) {
      setErrorMessage('请输入有效的手机号');
      return;
    }

    if (!code || code.length !== 6) {
      setErrorMessage('请输入6位验证码');
      return;
    }

    setIsLoading(true);

    const loginData = {
      tel: phone,
      code: code,
      cid: '86',
      source: 'main_mini',
      captcha_key: captchaKey,
      go_url: "https://www.bilibili.com",
      keep: true
    };

    try {
      const res = await fetch(`${serverHost}/proxy/bilibili/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      const dataRes: LoginResponse = await res.json();

      if (dataRes.data.code === 0) {
        onSuccess(phone, code);
        handleClose();
      } else {
        setErrorMessage(dataRes.message || '登录失败');
      }
    } catch (error) {
      setErrorMessage('登录失败: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white shadow-lg overflow-hidden animate-fade-in animate-zoom-in p-[52px_65px_29px_65px] rounded-lg box-border w-[520px] select-none relative"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div
          className="absolute top-5 right-5 w-8 h-8 bg-[url('https://s1.hdslb.com/bfs/seed/jinkela/short/mini-login-v2/img/close.a35a1809.svg')] bg-cover cursor-pointer z-[2]"
          onClick={handleClose}
        ></div>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">B站短信登录</h3>
        </div>
        <div className="px-6 py-4">
          <div className="mb-4">
            <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              手机号
            </Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneInput}
                placeholder="请输入手机号"
                maxLength={11}
                className="flex-1"
              />
              {isCaptchaReady && (
                <Button
                  id="verify-btn"
                  disabled={!isPhoneValid || countdown > 0 || isSending}
                  onClick={getCap}
                  className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}秒后重发` : '获取验证码'}
                </Button>
              )}
            </div>
          </div>
          <div className="mb-4">
            <Label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              验证码
            </Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={handleCodeInput}
              placeholder="请输入验证码"
              maxLength={6}
            />
          </div>
          {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}
          <Button
            onClick={handleLogin}
            disabled={!isPhoneValid || !code || code.length !== 6 || isLoading}
            className="w-full py-2 px-4 bg-[#00aeec] text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium box-border h-10 cursor-pointer text-[14px] text-center"
          >
            登录/注册
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BilibiliLoginModal;
