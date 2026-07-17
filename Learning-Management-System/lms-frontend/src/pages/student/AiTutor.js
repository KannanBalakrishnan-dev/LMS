import React, { useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  CircularProgress
} from '@mui/material';

import {
  Send as SendIcon,
  SmartToyOutlined as BotIcon
} from '@mui/icons-material';

import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';


const AiTutor = () => {

  const { user } = useAuth();

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm your AI Tutor. Ask me anything about your courses."
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const endRef = useRef(null);


  const handleSend = async (e) => {

    e.preventDefault();

    const question = input.trim();

    if (!question || loading) return;


    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: question
      }
    ]);

    setInput('');
    setLoading(true);


    try {

      // Backend URL:
      // Django -> path('api/ai/chat/', ai_chat)
      const res = await api.post('/assistant/chat/', { question });

     const rawAnswer = res.data?.answer || res.data?.reply;

const answer =
  typeof rawAnswer === "string"
    ? rawAnswer
    : rawAnswer?.message || "Sorry, I couldn't find an answer.";


      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: answer
        }
      ]);


    } catch (error) {

      console.error(
        "AI Tutor Error:",
        error.response?.data || error.message
      );


      const status = error?.response?.status;


      const fallback =
        status === 404
          ? "AI Tutor API endpoint not found."
          : "Something went wrong reaching the AI Tutor. Please try again.";


      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: fallback
        }
      ]);

    } finally {

      setLoading(false);


      setTimeout(() => {
        endRef.current?.scrollIntoView({
          behavior: 'smooth'
        });
      }, 100);

    }

  };



  return (

    <Box
      sx={{
        p: 3,
        maxWidth: 760,
        mx: 'auto'
      }}
    >

      <Typography
        variant="h5"
        fontWeight={800}
        sx={{
          mb: 0.5
        }}
      >
        AI Tutor
      </Typography>


      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          mb: 3
        }}
      >
        Ask questions about your course material and get instant help.
      </Typography>



      <Paper
        variant="outlined"
        sx={{
          borderRadius: 3,
          p: 2,
          height: 480,
          display: 'flex',
          flexDirection: 'column'
        }}
      >


        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            pr: 1
          }}
        >


          {messages.map((m, idx) => (

            <Box
              key={idx}
              sx={{
                display: 'flex',
                gap: 1.25,
                mb: 2,
                flexDirection:
                  m.role === 'user'
                    ? 'row-reverse'
                    : 'row'
              }}
            >


              <Avatar
                sx={{
                  width: 30,
                  height: 30,
                  bgcolor:
                    m.role === 'user'
                      ? 'primary.main'
                      : '#1E3A6B'
                }}
              >

                {
                  m.role === 'user'
                    ? (
                      user?.username
                        ?.charAt(0)
                        ?.toUpperCase() || 'U'
                    )
                    : (
                      <BotIcon
                        sx={{
                          fontSize: 18
                        }}
                      />
                    )
                }

              </Avatar>



              <Box
                sx={{
                  maxWidth: '75%',
                  px: 1.75,
                  py: 1,
                  borderRadius: 2.5,
                  bgcolor:
                    m.role === 'user'
                      ? 'primary.main'
                      : '#F1F5F9',
                  color:
                    m.role === 'user'
                      ? 'white'
                      : '#0f172a'
                }}
              >

                <Typography variant="body2">
                  {m.text}
                </Typography>

              </Box>


            </Box>

          ))}



          {
            loading && (

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  pl: 5
                }}
              >

                <CircularProgress size={16}/>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Thinking...
                </Typography>

              </Box>

            )
          }


          <div ref={endRef}/>


        </Box>




        <Box
          component="form"
          onSubmit={handleSend}
          sx={{
            display: 'flex',
            gap: 1,
            mt: 1.5
          }}
        >


          <TextField
            fullWidth
            size="small"
            placeholder="Ask the AI Tutor..."
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            disabled={loading}
          />


          <IconButton
            type="submit"
            color="primary"
            disabled={
              loading ||
              !input.trim()
            }
          >

            <SendIcon/>

          </IconButton>


        </Box>



      </Paper>


    </Box>

  );

};


export default AiTutor;